import { getSupabase } from "@/lib/supabase/server";
import {
  fichasSchemaReady,
  preguntasTableExists,
  supuestosSchemaReady,
} from "@/lib/queries/schema";

const PAGE = 1000;

export type BackupPayload = {
  format: "oposiciones-jex-backup";
  version: 1 | 2;
  exportedAt: string;
  stats: {
    materias: number;
    bancos: number;
    preguntas: number;
    lineas: number;
    mazos: number;
    fichas: number;
  };
  lineas: Record<string, unknown>[];
  materias: Record<string, unknown>[];
};

async function fetchAllPreguntas(): Promise<Map<string, Record<string, unknown>[]>> {
  const supabase = getSupabase();
  const byBanco = new Map<string, Record<string, unknown>[]>();
  const pageSize = 1000;
  const withSupuesto = await supuestosSchemaReady();

  for (let from = 0; ; from += pageSize) {
    const query = withSupuesto
      ? supabase
          .from("preguntas")
          .select(
            "id, banco_id, enunciado, opciones, respuesta, explicacion, orden, supuesto_id",
          )
      : supabase
          .from("preguntas")
          .select("id, banco_id, enunciado, opciones, respuesta, explicacion, orden");

    const { data, error } = await query
      .order("banco_id")
      .order("orden")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data as Record<string, unknown>[]) {
      const bancoId = String(row.banco_id);
      const list = byBanco.get(bancoId) ?? [];
      list.push(row);
      byBanco.set(bancoId, list);
    }

    if (data.length < pageSize) break;
  }

  return byBanco;
}

async function fetchAllSupuestos(): Promise<Map<string, Record<string, unknown>[]>> {
  const byBanco = new Map<string, Record<string, unknown>[]>();
  if (!(await supuestosSchemaReady())) return byBanco;

  const supabase = getSupabase();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("supuestos")
      .select("id, banco_id, titulo, texto, orden")
      .order("banco_id")
      .order("orden")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      const list = byBanco.get(row.banco_id) ?? [];
      list.push(row);
      byBanco.set(row.banco_id, list);
    }

    if (data.length < pageSize) break;
  }

  return byBanco;
}

async function fetchAllMazos(): Promise<Record<string, unknown>[]> {
  if (!(await fichasSchemaReady())) return [];
  const supabase = getSupabase();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mazos_fichas")
      .select("id, materia_id, nombre, active, created_at, updated_at")
      .order("materia_id")
      .order("nombre")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function fetchAllFichasByMazo(): Promise<Map<string, Record<string, unknown>[]>> {
  const byMazo = new Map<string, Record<string, unknown>[]>();
  if (!(await fichasSchemaReady())) return byMazo;
  const supabase = getSupabase();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("fichas")
      .select("id, mazo_id, frente, dorso, orden, created_at")
      .order("mazo_id")
      .order("orden")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data as Record<string, unknown>[]) {
      const mazoId = String(row.mazo_id);
      const list = byMazo.get(mazoId) ?? [];
      list.push(row);
      byMazo.set(mazoId, list);
    }
    if (data.length < PAGE) break;
  }
  return byMazo;
}

function nestBancoBackup(
  banco: Record<string, unknown>,
  preguntas: Record<string, unknown>[],
  supuestos: Record<string, unknown>[],
) {
  if (!supuestos.length) {
    return { ...banco, preguntas };
  }

  const bySupuesto = new Map<string, Record<string, unknown>[]>();
  const sueltas: Record<string, unknown>[] = [];

  for (const p of preguntas) {
    const sid = p.supuesto_id as string | null;
    if (sid) {
      const list = bySupuesto.get(sid) ?? [];
      list.push(p);
      bySupuesto.set(sid, list);
    } else {
      sueltas.push(p);
    }
  }

  const nestedSupuestos = supuestos.map((s) => ({
    ...s,
    preguntas: bySupuesto.get(s.id as string) ?? [],
  }));

  return {
    ...banco,
    supuestos: nestedSupuestos,
    preguntas: sueltas,
  };
}

export async function buildFullBackup(): Promise<BackupPayload> {
  const supabase = getSupabase();
  const hasPreguntas = await preguntasTableExists();

  const [materiasRes, lineasRes, bancosRes] = await Promise.all([
    supabase.from("materias").select("id, nombre").order("nombre"),
    supabase.from("lineas").select("id, nombre, slug").order("nombre"),
    supabase
      .from("bancos")
      .select("id, nombre, tipo, materia_id, active, linea_id")
      .order("nombre"),
  ]);

  if (materiasRes.error) throw new Error(materiasRes.error.message);
  if (lineasRes.error) throw new Error(lineasRes.error.message);
  if (bancosRes.error) throw new Error(bancosRes.error.message);

  const preguntasByBanco = hasPreguntas ? await fetchAllPreguntas() : new Map();
  const supuestosByBanco = hasPreguntas ? await fetchAllSupuestos() : new Map();
  const mazosRows = await fetchAllMazos();
  const fichasByMazo = await fetchAllFichasByMazo();
  let preguntasCount = 0;
  for (const list of preguntasByBanco.values()) preguntasCount += list.length;
  let fichasCount = 0;
  for (const list of fichasByMazo.values()) fichasCount += list.length;

  const bancosByMateria = new Map<string, Record<string, unknown>[]>();
  for (const banco of bancosRes.data ?? []) {
    const enriched = nestBancoBackup(
      banco,
      preguntasByBanco.get(banco.id) ?? [],
      supuestosByBanco.get(banco.id) ?? [],
    );
    const list = bancosByMateria.get(banco.materia_id) ?? [];
    list.push(enriched);
    bancosByMateria.set(banco.materia_id, list);
  }

  const mazosByMateria = new Map<string, Record<string, unknown>[]>();
  for (const mazo of mazosRows) {
    const mazoId = String(mazo.id);
    const nested = { ...mazo, fichas: fichasByMazo.get(mazoId) ?? [] };
    const materiaId = String(mazo.materia_id);
    const list = mazosByMateria.get(materiaId) ?? [];
    list.push(nested);
    mazosByMateria.set(materiaId, list);
  }

  const materias = (materiasRes.data ?? []).map((materia) => ({
    ...materia,
    bancos: bancosByMateria.get(materia.id) ?? [],
    mazos: mazosByMateria.get(materia.id) ?? [],
  }));

  const lineas = (lineasRes.data ?? []) as Record<string, unknown>[];

  return {
    format: "oposiciones-jex-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: {
      materias: materias.length,
      bancos: (bancosRes.data ?? []).length,
      preguntas: preguntasCount,
      lineas: lineas.length,
      mazos: mazosRows.length,
      fichas: fichasCount,
    },
    lineas,
    materias,
  };
}

export async function buildMateriaBackup(materiaId: string): Promise<Record<string, unknown>> {
  const backup = await buildFullBackup();
  const materia = backup.materias.find((m) => m.id === materiaId);
  if (!materia) throw new Error("Materia no encontrada");
  return materia;
}
