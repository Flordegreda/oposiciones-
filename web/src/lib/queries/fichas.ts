import "server-only";

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

type MazoRow = {
  id: string;
  nombre: string;
  materia_id: string;
  active: boolean;
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
    active: row.active,
  };
}

async function countFichasByMazo(mazoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!mazoIds.length) return map;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("fichas").select("mazo_id").in("mazo_id", mazoIds);
  if (error || !data) return map;

  for (const row of data) {
    const id = row.mazo_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function fetchMazosFichas(opts?: {
  activeOnly?: boolean;
}): Promise<MazoFichas[]> {
  if (!(await fichasSchemaReady())) return [];

  const supabase = getSupabase();
  let q = supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id, active, materias(nombre)")
    .order("nombre");

  if (opts?.activeOnly !== false) {
    q = q.eq("active", true);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  const rows = data as unknown as MazoRow[];
  const counts = await countFichasByMazo(rows.map((r) => r.id));
  return rows
    .map((r) => toMazo(r, counts.get(r.id) ?? 0))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
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

  const { data: fichasData, error: fErr } = await supabase
    .from("fichas")
    .select("id, frente, dorso, orden")
    .eq("mazo_id", mazoId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (fErr) throw fErr;

  const fichas: FichaCard[] = (fichasData ?? []).map((f) => ({
    id: f.id as string,
    frente: f.frente as string,
    dorso: f.dorso as string,
    orden: (f.orden as number) ?? 0,
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
    supabase.from("mazos_fichas").select("*", { count: "exact", head: true }),
    supabase.from("fichas").select("*", { count: "exact", head: true }),
  ]);

  return {
    mazos: mazosRes.count ?? 0,
    fichas: fichasRes.count ?? 0,
  };
}
