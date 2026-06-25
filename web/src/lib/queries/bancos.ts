import { getSupabase } from "@/lib/supabase/server";
import { JEX_SLUG } from "@/lib/constants";
import type { PrintBundle, PrintablePregunta } from "@/lib/print-test";
import { preguntasTableExists } from "@/lib/queries/schema";

export type BancoRow = {
  id: string;
  nombre: string;
  tipo: string;
  materia_id: string;
  active?: boolean;
  linea_id?: string | null;
  materias: { nombre: string } | { nombre: string }[] | null;
  numPreguntas?: number;
};

export type PreguntaRow = {
  id: string;
  banco_id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion: string | null;
  orden: number;
};

export type MateriaSection = {
  id: string;
  nombre: string;
  bancos: BancoRow[];
};

export type TipoStats = {
  bancos: number;
  preguntas: number;
};

export type MateriaStatsRow = {
  id: string;
  nombre: string;
  bancos: number;
  preguntas: number;
  teorico: TipoStats;
  practico: TipoStats;
};

export type MaterialStats = {
  materias: number;
  bancos: number;
  preguntas: number;
  teorico: TipoStats;
  practico: TipoStats;
  porMateria: MateriaStatsRow[];
};

const emptyTipoStats = (): TipoStats => ({ bancos: 0, preguntas: 0 });

const PAGE_SIZE = 1000;

export async function getJexLineaId(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("lineas")
    .select("id")
    .eq("slug", JEX_SLUG)
    .maybeSingle();
  return data?.id ?? null;
}

export function materiaNombre(m: BancoRow["materias"]): string {
  if (!m) return "Sin materia";
  if (Array.isArray(m)) return m[0]?.nombre ?? "Sin materia";
  return m.nombre;
}

export function sortBancosByNombre(bancos: BancoRow[]): BancoRow[] {
  return [...bancos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}

function attachPreguntaCounts(
  rows: BancoRow[],
  counts: Map<string, number>,
): BancoRow[] {
  return rows.map((b) => ({ ...b, numPreguntas: counts.get(b.id) ?? 0 }));
}

/** Cuenta preguntas por banco (RPC rápido o plan B en paralelo). */
export async function fetchPreguntaCountsByBanco(
  bancoIds?: string[],
): Promise<Map<string, number>> {
  const filter = bancoIds?.length ? new Set(bancoIds) : null;
  const supabase = getSupabase();

  const { data: rpcData, error: rpcError } = await supabase.rpc("preguntas_counts_by_banco");

  if (!rpcError && Array.isArray(rpcData)) {
    const tally = new Map<string, number>();
    for (const row of rpcData as { banco_id: string; cnt: number | string }[]) {
      if (filter && !filter.has(row.banco_id)) continue;
      tally.set(row.banco_id, Number(row.cnt) || 0);
    }
    if (filter) {
      for (const id of filter) {
        if (!tally.has(id)) tally.set(id, 0);
      }
    }
    return tally;
  }

  return fetchPreguntaCountsParallel(bancoIds);
}

async function fetchPreguntaCountsParallel(bancoIds?: string[]): Promise<Map<string, number>> {
  const tally = new Map<string, number>();
  const supabase = getSupabase();

  if (bancoIds?.length) {
    const BATCH = 20;
    for (let i = 0; i < bancoIds.length; i += BATCH) {
      const batch = bancoIds.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (id) => {
          const { count, error } = await supabase
            .from("preguntas")
            .select("*", { count: "exact", head: true })
            .eq("banco_id", id);
          tally.set(id, error ? 0 : (count ?? 0));
        }),
      );
    }
    return tally;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("banco_id")
      .order("banco_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      tally.set(row.banco_id, (tally.get(row.banco_id) ?? 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
  }

  return tally;
}

async function fetchPreguntasForBanco(bancoId: string): Promise<PreguntaRow[]> {
  const supabase = getSupabase();
  const rows: PreguntaRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("id, banco_id, enunciado, opciones, respuesta, explicacion, orden")
      .eq("banco_id", bancoId)
      .order("orden")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(
      ...data.map((p) => ({
        ...p,
        opciones: p.opciones as string[],
      })),
    );

    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

function groupByMateria(rows: BancoRow[]): MateriaSection[] {
  const map = new Map<string, MateriaSection>();
  for (const b of rows) {
    const key = b.materia_id;
    const nombre = materiaNombre(b.materias);
    if (!map.has(key)) map.set(key, { id: key, nombre, bancos: [] });
    map.get(key)!.bancos.push(b);
  }
  return [...map.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
    .map((section) => ({
      ...section,
      bancos: sortBancosByNombre(section.bancos),
    }));
}

async function queryBancosForPracticar() {
  const supabase = getSupabase();
  const jexId = await getJexLineaId();

  let query = supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, linea_id, materias(nombre)")
    .order("nombre");
  if (jexId) {
    query = query.or(`linea_id.is.null,linea_id.eq.${jexId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BancoRow[];
}

async function queryAllBancos() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, linea_id, materias(nombre)")
    .order("nombre");

  if (error) throw error;
  return (data ?? []) as unknown as BancoRow[];
}

/** Temario único jurídicas JEX: bancos con preguntas (legacy común + JEX). */
export async function getPracticarDataUncached() {
  const rows = await queryBancosForPracticar();
  const hasPreguntas = await preguntasTableExists();
  const counts = hasPreguntas
    ? await fetchPreguntaCountsByBanco(rows.map((b) => b.id))
    : new Map<string, number>();

  const withCounts = attachPreguntaCounts(rows, counts);
  const practicables = hasPreguntas
    ? withCounts.filter((b) => (b.numPreguntas ?? 0) > 0)
    : withCounts;

  return {
    sections: groupByMateria(practicables),
  };
}

export async function getAdminBancos(): Promise<BancoRow[]> {
  const rows = await queryAllBancos();
  const hasPreguntas = await preguntasTableExists();
  if (!hasPreguntas) return rows;

  const counts = await fetchPreguntaCountsByBanco(rows.map((b) => b.id));
  return sortBancosByNombre(attachPreguntaCounts(rows, counts));
}

export async function getBancoForAdmin(id: string) {
  const supabase = getSupabase();
  const { data: banco, error } = await supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, materias(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!banco) return null;

  let preguntas: PreguntaRow[] = [];
  const hasPreguntas = await preguntasTableExists();
  if (hasPreguntas) {
    preguntas = await fetchPreguntasForBanco(id);
  }

  return { banco: banco as BancoRow, preguntas };
}

export const getBancoWithPreguntas = getBancoForAdmin;

export async function getMateriasWithCounts() {
  const supabase = getSupabase();
  const { data: materias, error } = await supabase
    .from("materias")
    .select("id, nombre")
    .order("nombre");
  if (error) throw error;

  const { data: counts } = await supabase.from("bancos").select("materia_id");
  const tally = new Map<string, number>();
  for (const row of counts ?? []) {
    tally.set(row.materia_id, (tally.get(row.materia_id) ?? 0) + 1);
  }

  return (materias ?? []).map((m) => ({
    ...m,
    bancos: tally.get(m.id) ?? 0,
  }));
}

export async function getMaterialStatsUncached(): Promise<MaterialStats> {
  const supabase = getSupabase();
  const [{ data: materias, error: mErr }, { data: bancos, error: bErr }] = await Promise.all([
    supabase.from("materias").select("id, nombre").order("nombre"),
    supabase.from("bancos").select("id, materia_id, tipo"),
  ]);

  if (mErr) throw mErr;
  if (bErr) throw bErr;

  const hasPreguntas = await preguntasTableExists();
  const counts = hasPreguntas
    ? await fetchPreguntaCountsByBanco((bancos ?? []).map((b) => b.id))
    : new Map<string, number>();

  const materiaMap = new Map<string, MateriaStatsRow>();
  for (const m of materias ?? []) {
    materiaMap.set(m.id, {
      id: m.id,
      nombre: m.nombre,
      bancos: 0,
      preguntas: 0,
      teorico: emptyTipoStats(),
      practico: emptyTipoStats(),
    });
  }

  const totals: MaterialStats = {
    materias: materias?.length ?? 0,
    bancos: bancos?.length ?? 0,
    preguntas: 0,
    teorico: emptyTipoStats(),
    practico: emptyTipoStats(),
    porMateria: [],
  };

  for (const b of bancos ?? []) {
    const n = counts.get(b.id) ?? 0;
    const tipo = b.tipo === "practico" ? "practico" : "teorico";
    totals.preguntas += n;
    totals[tipo].bancos += 1;
    totals[tipo].preguntas += n;

    let row = materiaMap.get(b.materia_id);
    if (!row) {
      row = {
        id: b.materia_id,
        nombre: "Sin materia",
        bancos: 0,
        preguntas: 0,
        teorico: emptyTipoStats(),
        practico: emptyTipoStats(),
      };
      materiaMap.set(b.materia_id, row);
    }

    row.bancos += 1;
    row.preguntas += n;
    row[tipo].bancos += 1;
    row[tipo].preguntas += n;
  }

  totals.porMateria = [...materiaMap.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );

  return totals;
}

export async function getPrintBundleForMateria(materiaId: string): Promise<PrintBundle> {
  const supabase = getSupabase();
  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id, nombre")
    .eq("id", materiaId)
    .single();

  if (mErr || !materia) throw new Error("Materia no encontrada");

  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, tipo")
    .eq("materia_id", materiaId)
    .order("nombre");

  if (bErr) throw bErr;

  const hasPreguntas = await preguntasTableExists();
  const sections: PrintBundle["sections"] = [];
  let totalPreguntas = 0;

  for (const b of bancos ?? []) {
    if (!hasPreguntas) continue;
    const rows = await fetchPreguntasForBanco(b.id);
    if (!rows.length) continue;

    const preguntas: PrintablePregunta[] = rows.map((p) => ({
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta: p.respuesta,
      explicacion: p.explicacion,
    }));

    totalPreguntas += preguntas.length;
    sections.push({
      bancoId: b.id,
      bancoNombre: b.nombre,
      tipo: b.tipo,
      preguntas,
    });
  }

  return {
    title: materia.nombre,
    subtitle: `${sections.length} banco(s) · ${totalPreguntas} pregunta(s)`,
    sections,
    totalPreguntas,
  };
}

export async function getPrintBundleForBanco(bancoId: string): Promise<PrintBundle> {
  const supabase = getSupabase();
  const { data: banco, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, tipo")
    .eq("id", bancoId)
    .single();

  if (bErr || !banco) throw new Error("Banco no encontrado");

  const hasPreguntas = await preguntasTableExists();
  if (!hasPreguntas) {
    return { title: banco.nombre, subtitle: "0 preguntas", sections: [], totalPreguntas: 0 };
  }

  const rows = await fetchPreguntasForBanco(bancoId);
  const preguntas: PrintablePregunta[] = rows.map((p) => ({
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion,
  }));

  return {
    title: banco.nombre,
    subtitle: `${preguntas.length} pregunta${preguntas.length !== 1 ? "s" : ""}`,
    sections: [
      {
        bancoId: banco.id,
        bancoNombre: banco.nombre,
        tipo: banco.tipo,
        preguntas,
      },
    ],
    totalPreguntas: preguntas.length,
  };
}

/** IDs de bancos sin ninguna pregunta (conteo paginado fiable). */
export async function findEmptyBancoIds(): Promise<{ id: string; nombre: string }[]> {
  const supabase = getSupabase();
  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre")
    .order("nombre");

  if (bErr) throw bErr;

  const counts = await fetchPreguntaCountsByBanco();
  return (bancos ?? []).filter((b) => (counts.get(b.id) ?? 0) === 0);
}
