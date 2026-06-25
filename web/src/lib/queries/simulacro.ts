import type { ExamPregunta, SimulacroPresetId } from "@/lib/exam-utils";
import {
  pickSimulacroMix,
  presetSummary,
  simulacroTimerSeconds,
} from "@/lib/exam-utils";
import { getSupabase } from "@/lib/supabase/server";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { preguntasTableExists } from "@/lib/queries/schema";

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
  opciones: unknown;
  respuesta: number;
  explicacion: string | null;
};

async function fetchPreguntasForBancos(bancoIds: string[]): Promise<PreguntaRow[]> {
  if (!bancoIds.length) return [];
  const supabase = getSupabase();
  const pageSize = 1000;
  const rows: PreguntaRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("id, banco_id, enunciado, opciones, respuesta, explicacion")
      .in("banco_id", bancoIds)
      .order("banco_id")
      .order("orden")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as PreguntaRow[]));
    if (data.length < pageSize) break;
  }

  return rows;
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

  const data = await fetchPreguntasForBancos(bancoIds);
  const all: ExamPregunta[] = data.map((p) => {
    const materia = materiaByBanco.get(p.banco_id);
    return {
      id: p.id,
      bancoId: p.banco_id,
      tipo: tipoByBanco.get(p.banco_id) ?? "teorico",
      materiaId: materia?.id,
      materiaNombre: materia?.nombre,
      enunciado: p.enunciado,
      opciones: p.opciones as string[],
      respuesta: p.respuesta,
      explicacion: p.explicacion ?? undefined,
    };
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
