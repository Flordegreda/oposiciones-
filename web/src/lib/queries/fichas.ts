import "server-only";

import { cache } from "react";
import { CACHE_TAGS, cachedQuery } from "@/lib/content-cache";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

export type FichaCard = {
  id: string;
  frente: string;
  dorso: string;
  orden: number;
};

export type MazoFichas = {
  id: string;
  nombre: string;
  materiaId: string;
  materiaNombre: string;
  numFichas: number;
  active: boolean;
};

export type MazoFichasSection = {
  materiaId: string;
  materiaNombre: string;
  mazos: MazoFichas[];
};

export type MazoConFichas = {
  mazo: MazoFichas;
  fichas: FichaCard[];
};

export type FichasMateriaStats = {
  mazos: number;
  fichas: number;
};

type MazoRow = {
  id: string;
  nombre: string;
  materia_id: string;
  active: boolean | null;
  materias: { nombre: string } | { nombre: string }[] | null;
};

function materiaNombre(m: MazoRow["materias"]): string {
  if (!m) return "Sin materia";
  if (Array.isArray(m)) return m[0]?.nombre ?? "Sin materia";
  return m.nombre;
}

function toMazo(row: MazoRow, numFichas: number): MazoFichas {
  return {
    id: row.id,
    nombre: row.nombre,
    materiaId: row.materia_id,
    materiaNombre: materiaNombre(row.materias),
    numFichas,
    /** `null` (columna antigua sin rellenar) cuenta como visible. */
    active: row.active !== false,
  };
}

const PAGE_SIZE = 1000;

/** PostgREST corta a 1000 filas; hay que paginar mazos. */
async function fetchAllMazoRows(): Promise<MazoRow[]> {
  const supabase = getSupabase();
  const rows: MazoRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("mazos_fichas")
      .select("id, nombre, materia_id, active, materias(nombre)")
      .order("nombre")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as unknown as MazoRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Recuento por mazo: RPC (1 consulta) o un barrido de `mazo_id`.
 * Un COUNT por mazo eran ~90 idas a Supabase y dejaba Material colgado.
 */
async function countFichasByMazo(mazoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!mazoIds.length) return map;
  for (const id of mazoIds) map.set(id, 0);

  const supabase = getSupabase();
  const { data: rpcData, error: rpcError } = await supabase.rpc("fichas_counts_by_mazo");
  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData as { mazo_id: string; cnt: number | string }[]) {
      map.set(row.mazo_id, Number(row.cnt) || 0);
    }
    return map;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("fichas")
      .select("mazo_id")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data as { mazo_id: string }[]) {
      map.set(row.mazo_id, (map.get(row.mazo_id) ?? 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return map;
}

type MazosPayload = {
  rows: MazoRow[];
  counts: Record<string, number>;
};

async function loadMazosAndCountsUncached(): Promise<MazosPayload> {
  try {
    const rows = await fetchAllMazoRows();
    const counts = await countFichasByMazo(rows.map((r) => r.id));
    return { rows, counts: Object.fromEntries(counts) };
  } catch {
    return { rows: [], counts: {} };
  }
}

const loadMazosPayload = cache(async () =>
  cachedQuery("mazos-fichas-list", loadMazosAndCountsUncached, CACHE_TAGS.temario),
);

async function loadMazosAndCounts(): Promise<{
  rows: MazoRow[];
  counts: Map<string, number>;
}> {
  const { rows, counts } = await loadMazosPayload();
  return { rows, counts: new Map(Object.entries(counts)) };
}

export async function fetchMazosFichas(opts?: {
  activeOnly?: boolean;
}): Promise<MazoFichas[]> {
  const { rows, counts } = await loadMazosAndCounts();
  let mazos = rows.map((r) => toMazo(r, counts.get(r.id) ?? 0));
  if (opts?.activeOnly !== false) {
    mazos = mazos.filter((m) => m.active);
  }
  return mazos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

/** Recuento de mazos/fichas por materia (resumen de Material y checklist). */
export async function fetchFichasStatsByMateria(): Promise<{
  totals: { mazos: number; fichas: number };
  porMateria: Map<string, FichasMateriaStats>;
}> {
  const empty = {
    totals: { mazos: 0, fichas: 0 },
    porMateria: new Map<string, FichasMateriaStats>(),
  };
  const { rows, counts } = await loadMazosAndCounts();
  if (!rows.length) return empty;

  let totalFichas = 0;
  const porMateria = new Map<string, FichasMateriaStats>();
  for (const row of rows) {
    const n = counts.get(row.id) ?? 0;
    totalFichas += n;
    const cur = porMateria.get(row.materia_id) ?? { mazos: 0, fichas: 0 };
    cur.mazos += 1;
    cur.fichas += n;
    porMateria.set(row.materia_id, cur);
  }

  return {
    totals: { mazos: rows.length, fichas: totalFichas },
    porMateria,
  };
}

export async function fetchMazosGrouped(): Promise<MazoFichasSection[]> {
  const mazos = await fetchMazosFichas({ activeOnly: true });
  const map = new Map<string, MazoFichasSection>();

  for (const mazo of mazos) {
    if (!map.has(mazo.materiaId)) {
      map.set(mazo.materiaId, {
        materiaId: mazo.materiaId,
        materiaNombre: mazo.materiaNombre,
        mazos: [],
      });
    }
    map.get(mazo.materiaId)!.mazos.push(mazo);
  }

  return [...map.values()].sort((a, b) =>
    a.materiaNombre.localeCompare(b.materiaNombre, "es", { sensitivity: "base" }),
  );
}

export async function getMazoConFichas(mazoId: string): Promise<MazoConFichas | null> {
  if (!(await fichasSchemaReady())) return null;

  const supabase = getSupabase();
  const { data: mazoData, error: mErr } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id, active, materias(nombre)")
    .eq("id", mazoId)
    .maybeSingle();

  if (mErr || !mazoData) return null;
  const mazoRow = mazoData as unknown as MazoRow;

  const fichasRaw: { id: string; frente: string; dorso: string; orden: number | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: fichasData, error: fErr } = await supabase
      .from("fichas")
      .select("id, frente, dorso, orden")
      .eq("mazo_id", mazoId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (fErr) throw fErr;
    if (!fichasData?.length) break;
    fichasRaw.push(
      ...(fichasData as { id: string; frente: string; dorso: string; orden: number | null }[]),
    );
    if (fichasData.length < PAGE_SIZE) break;
  }

  const fichas: FichaCard[] = fichasRaw.map((f) => ({
    id: f.id,
    frente: f.frente,
    dorso: f.dorso,
    orden: f.orden ?? 0,
  }));

  return {
    mazo: toMazo(mazoRow, fichas.length),
    fichas,
  };
}

/** Totales para las estadísticas de Material (0 si el esquema no está activo). */
export async function countFichasTotals(): Promise<{ mazos: number; fichas: number }> {
  if (!(await fichasSchemaReady())) return { mazos: 0, fichas: 0 };

  const supabase = getSupabase();
  const [mazosRes, fichasRes] = await Promise.all([
    supabase.from("mazos_fichas").select("id", { count: "exact", head: true }),
    supabase.from("fichas").select("id", { count: "exact", head: true }),
  ]);

  return {
    mazos: mazosRes.count ?? 0,
    fichas: fichasRes.count ?? 0,
  };
}
