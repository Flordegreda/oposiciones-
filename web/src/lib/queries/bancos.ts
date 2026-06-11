import { getSupabase } from "@/lib/supabase/server";
import { JEX_SLUG } from "@/lib/constants";
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
  nombre: string;
  bancos: BancoRow[];
};

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

function attachPreguntaCounts(
  rows: BancoRow[],
  counts: Map<string, number>,
): BancoRow[] {
  return rows.map((b) => ({ ...b, numPreguntas: counts.get(b.id) ?? 0 }));
}

async function fetchPreguntaCounts(bancoIds: string[]): Promise<Map<string, number>> {
  const tally = new Map<string, number>();
  if (!bancoIds.length) return tally;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("preguntas")
    .select("banco_id")
    .in("banco_id", bancoIds);

  if (error) return tally;
  for (const row of data ?? []) {
    tally.set(row.banco_id, (tally.get(row.banco_id) ?? 0) + 1);
  }
  return tally;
}

function groupByMateria(rows: BancoRow[]): MateriaSection[] {
  const map = new Map<string, MateriaSection>();
  for (const b of rows) {
    const key = b.materia_id;
    const nombre = materiaNombre(b.materias);
    if (!map.has(key)) map.set(key, { nombre, bancos: [] });
    map.get(key)!.bancos.push(b);
  }
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function queryBancos() {
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

/** Temario único jurídicas JEX: todos los bancos visibles (legacy común + JEX). */
export async function getPracticarData() {
  const rows = await queryBancos();
  const hasPreguntas = await preguntasTableExists();
  const counts = hasPreguntas
    ? await fetchPreguntaCounts(rows.map((b) => b.id))
    : new Map<string, number>();

  return {
    sections: groupByMateria(attachPreguntaCounts(rows, counts)),
  };
}

export async function getAdminBancos(): Promise<BancoRow[]> {
  const rows = await queryBancos();
  const hasPreguntas = await preguntasTableExists();
  if (!hasPreguntas) return rows;

  const counts = await fetchPreguntaCounts(rows.map((b) => b.id));
  return attachPreguntaCounts(rows, counts);
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
    const { data, error: pErr } = await supabase
      .from("preguntas")
      .select("id, banco_id, enunciado, opciones, respuesta, explicacion, orden")
      .eq("banco_id", id)
      .order("orden");

    if (!pErr) {
      preguntas = (data ?? []).map((p) => ({
        ...p,
        opciones: p.opciones as string[],
      }));
    }
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
