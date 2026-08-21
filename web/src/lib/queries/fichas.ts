import "server-only";

import { cache } from "react";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";
import { compareMateriasByNombre } from "@/lib/temario-catalogo";

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
const COUNT_CONCURRENCY = 10;

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
 * Recuento exacto por mazo (HEAD count).
 * Un `.select()` o `.in()` + range se queda en 1000 filas y deja mazos posteriores a 0.
 */
async function countFichasByMazo(mazoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!mazoIds.length) return map;

  const supabase = getSupabase();
  for (let i = 0; i < mazoIds.length; i += COUNT_CONCURRENCY) {
    const chunk = mazoIds.slice(i, i + COUNT_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (id) => {
        const { count, error } = await supabase
          .from("fichas")
          .select("id", { count: "exact", head: true })
          .eq("mazo_id", id);
        if (error) throw error;
        return [id, count ?? 0] as const;
      }),
    );
    for (const [id, n] of results) map.set(id, n);
  }
  return map;
}

const loadMazosAndCounts = cache(async (): Promise<{
  rows: MazoRow[];
  counts: Map<string, number>;
}> => {
  try {
    const rows = await fetchAllMazoRows();
    const counts = await countFichasByMazo(rows.map((r) => r.id));
    return { rows, counts };
  } catch {
    return { rows: [], counts: new Map() };
  }
});

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
    compareMateriasByNombre(a.materiaNombre, b.materiaNombre),
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
