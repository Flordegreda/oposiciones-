import { getSupabase } from "@/lib/supabase/server";
import { preguntasTableExists, supuestosSchemaReady } from "@/lib/queries/schema";

export type BackupPayload = {
  format: "oposiciones-jex-backup";
  version: 1;
  exportedAt: string;
  stats: {
    materias: number;
    bancos: number;
    preguntas: number;
    lineas: number;
  };
  lineas: Record<string, unknown>[];
  materias: Record<string, unknown>[];
};

async function fetchAllPreguntas(): Promise<Map<string, Record<string, unknown>[]>> {
  const supabase = getSupabase();
  const byBanco = new Map<string, Record<string, unknown>[]>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("*")
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

async function fetchAllSupuestos(): Promise<Map<string, Record<string, unknown>[]>> {
  const byBanco = new Map<string, Record<string, unknown>[]>();
  if (!(await supuestosSchemaReady())) return byBanco;

  const supabase = getSupabase();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("supuestos")
      .select("*")
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
    supabase.from("materias").select("*").order("nombre"),
    supabase.from("lineas").select("*").order("nombre"),
    supabase.from("bancos").select("*").order("nombre"),
  ]);

  if (materiasRes.error) throw new Error(materiasRes.error.message);
  if (lineasRes.error) throw new Error(lineasRes.error.message);
  if (bancosRes.error) throw new Error(bancosRes.error.message);

  const preguntasByBanco = hasPreguntas ? await fetchAllPreguntas() : new Map();
  const supuestosByBanco = hasPreguntas ? await fetchAllSupuestos() : new Map();
  let preguntasCount = 0;
  for (const list of preguntasByBanco.values()) preguntasCount += list.length;

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

  const materias = (materiasRes.data ?? []).map((materia) => ({
    ...materia,
    bancos: bancosByMateria.get(materia.id) ?? [],
  }));

  const lineas = (lineasRes.data ?? []) as Record<string, unknown>[];

  return {
    format: "oposiciones-jex-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    stats: {
      materias: materias.length,
      bancos: (bancosRes.data ?? []).length,
      preguntas: preguntasCount,
      lineas: lineas.length,
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
