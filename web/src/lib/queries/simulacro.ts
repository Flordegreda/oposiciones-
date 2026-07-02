import type { ExamPregunta, SimulacroPresetId } from "@/lib/exam-utils";
import {
  pickSimulacroMix,
  presetSummary,
  simulacroTimerSeconds,
} from "@/lib/exam-utils";
import { getSupabase } from "@/lib/supabase/server";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { preguntasTableExists, supuestosSchemaReady } from "@/lib/queries/schema";
import {
  attachSupuestoToExamPregunta,
  sortPreguntasWithSupuestos,
  type SupuestoRow,
} from "@/lib/supuesto-utils";

export type SimulacroMateriaPool = {
  id: string;
  nombre: string;
  teorico: number;
  practico: number;
};

export type SimulacroMeta = {
  materias: SimulacroMateriaPool[];
  pool: { teorico: number; practico: number };
};

type PreguntaRow = {
  id: string;
  banco_id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion: string | null;
  orden: number;
  supuesto_id: string | null;
};

const PAGE_SIZE = 1000;
const PREGUNTA_SELECT_BASE =
  "id, banco_id, enunciado, opciones, respuesta, explicacion, orden";
const PREGUNTA_SELECT_WITH_SUPUESTO = `${PREGUNTA_SELECT_BASE}, supuesto_id`;

async function fetchSupuestosForBancos(bancoIds: string[]): Promise<Map<string, SupuestoRow>> {
  const map = new Map<string, SupuestoRow>();
  if (!bancoIds.length || !(await supuestosSchemaReady())) return map;

  const supabase = getSupabase();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("supuestos")
      .select("id, banco_id, titulo, texto, orden")
      .in("banco_id", bancoIds)
      .order("orden")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;
    for (const row of data as SupuestoRow[]) map.set(row.id, row);
    if (data.length < PAGE_SIZE) break;
  }

  return map;
}

async function fetchPreguntasForBancos(bancoIds: string[]): Promise<PreguntaRow[]> {
  if (!bancoIds.length) return [];
  const supabase = getSupabase();
  const withSupuesto = await supuestosSchemaReady();
  const rows: PreguntaRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let batchLen = 0;

    if (withSupuesto) {
      const { data, error } = await supabase
        .from("preguntas")
        .select(PREGUNTA_SELECT_WITH_SUPUESTO)
        .in("banco_id", bancoIds)
        .order("banco_id")
        .order("orden")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;
      batchLen = data.length;
      rows.push(
        ...data.map((p) => ({
          ...p,
          opciones: p.opciones as string[],
          supuesto_id: p.supuesto_id ?? null,
        })),
      );
    } else {
      const { data, error } = await supabase
        .from("preguntas")
        .select(PREGUNTA_SELECT_BASE)
        .in("banco_id", bancoIds)
        .order("banco_id")
        .order("orden")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;
      batchLen = data.length;
      rows.push(
        ...data.map((p) => ({
          ...p,
          opciones: p.opciones as string[],
          supuesto_id: null,
        })),
      );
    }

    if (batchLen < PAGE_SIZE) break;
  }

  if (!withSupuesto) return rows;

  const supuestoById = await fetchSupuestosForBancos(bancoIds);
  return sortPreguntasWithSupuestos(rows, supuestoById);
}

function buildMetaFromSections(
  sections: Awaited<ReturnType<typeof getPracticarData>>["sections"],
): SimulacroMeta {
  const materias: SimulacroMateriaPool[] = [];
  let teorico = 0;
  let practico = 0;

  for (const section of sections) {
    let mTeorico = 0;
    let mPractico = 0;
    for (const banco of section.bancos) {
      const n = banco.numPreguntas ?? 0;
      if (banco.tipo === "practico") {
        mPractico += n;
        practico += n;
      } else {
        mTeorico += n;
        teorico += n;
      }
    }
    if (mTeorico + mPractico > 0) {
      materias.push({
        id: section.id,
        nombre: section.nombre,
        teorico: mTeorico,
        practico: mPractico,
      });
    }
  }

  return { materias, pool: { teorico, practico } };
}

export async function getSimulacroMeta(): Promise<SimulacroMeta> {
  if (!(await preguntasTableExists())) {
    return { materias: [], pool: { teorico: 0, practico: 0 } };
  }
  const { sections } = await getPracticarData();
  return buildMetaFromSections(sections);
}

export async function startSimulacroSession(
  presetId: SimulacroPresetId,
  materiaId?: string | null,
) {
  if (!(await preguntasTableExists())) {
    throw new Error("No hay tabla de preguntas");
  }

  const { sections } = await getPracticarData();
  const tipoByBanco = new Map<string, "teorico" | "practico">();
  const materiaByBanco = new Map<string, { id: string; nombre: string }>();
  const bancoIds: string[] = [];

  for (const section of sections) {
    if (materiaId && section.id !== materiaId) continue;
    for (const banco of section.bancos) {
      if ((banco.numPreguntas ?? 0) === 0) continue;
      bancoIds.push(banco.id);
      tipoByBanco.set(banco.id, banco.tipo === "practico" ? "practico" : "teorico");
      materiaByBanco.set(banco.id, { id: section.id, nombre: section.nombre });
    }
  }

  if (!bancoIds.length) {
    throw new Error("No hay preguntas disponibles para este simulacro");
  }

  const supuestoById = await fetchSupuestosForBancos(bancoIds);
  const data = await fetchPreguntasForBancos(bancoIds);
  const all: ExamPregunta[] = data.map((p) => {
    const materia = materiaByBanco.get(p.banco_id);
    return attachSupuestoToExamPregunta(p, supuestoById, {
      tipo: tipoByBanco.get(p.banco_id) ?? "teorico",
      materiaId: materia?.id,
      materiaNombre: materia?.nombre,
    });
  });

  const pick = pickSimulacroMix(all, presetId);
  if (!pick.list.length) {
    throw new Error("No hay suficientes preguntas para este simulacro");
  }

  const materiaLabel = materiaId
    ? (materiasFindName(sections, materiaId) ?? null)
    : null;

  return {
    list: pick.list,
    pick,
    timerSeconds: simulacroTimerSeconds(presetId, pick.list.length),
    presetId,
    materiaLabel,
    subtitle: presetSummary(presetId, pick),
  };
}

function materiasFindName(
  sections: Awaited<ReturnType<typeof getPracticarData>>["sections"],
  id: string,
): string | undefined {
  return sections.find((s) => s.id === id)?.nombre;
}
