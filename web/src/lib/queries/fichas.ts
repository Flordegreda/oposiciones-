import {
  parseTemaFromMarkdown,
  parseTituloFromMarkdown,
  splitLegacyMateriaResumen,
} from "@/lib/ficha-utils";
import { materiaFichasReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

export type MateriaFichaRow = {
  id: string;
  materia_id: string;
  tema_numero: number;
  titulo: string;
  resumen_md: string | null;
};

export async function getFichasByMateria(materiaId: string): Promise<MateriaFichaRow[]> {
  if (!(await materiaFichasReady())) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_fichas")
    .select("id, materia_id, tema_numero, titulo, resumen_md")
    .eq("materia_id", materiaId)
    .order("tema_numero");
  if (error) throw error;
  return (data ?? []) as MateriaFichaRow[];
}

export async function getFichaByTema(
  materiaId: string,
  temaNumero: number,
): Promise<(MateriaFichaRow & { materia_nombre?: string }) | null> {
  if (!(await materiaFichasReady())) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_fichas")
    .select("id, materia_id, tema_numero, titulo, resumen_md, materias(nombre)")
    .eq("materia_id", materiaId)
    .eq("tema_numero", temaNumero)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const m = data.materias as { nombre: string } | { nombre: string }[] | null;
  const materia_nombre = Array.isArray(m) ? m[0]?.nombre : m?.nombre;
  const row = data as MateriaFichaRow & {
    materias?: { nombre: string } | { nombre: string }[] | null;
  };
  return {
    id: row.id,
    materia_id: row.materia_id,
    tema_numero: row.tema_numero,
    titulo: row.titulo,
    resumen_md: row.resumen_md,
    materia_nombre,
  };
}

export async function fetchFichaCountsByMateria(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!(await materiaFichasReady())) return map;
  const supabase = getSupabase();
  const { data, error } = await supabase.from("materia_fichas").select("materia_id");
  if (error) return map;
  for (const row of data ?? []) {
    map.set(row.materia_id, (map.get(row.materia_id) ?? 0) + 1);
  }
  return map;
}

export async function upsertMateriaFicha(input: {
  materiaId: string;
  temaNumero: number;
  titulo: string;
  resumenMd: string;
}): Promise<MateriaFichaRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_fichas")
    .upsert(
      {
        materia_id: input.materiaId,
        tema_numero: input.temaNumero,
        titulo: input.titulo,
        resumen_md: input.resumenMd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "materia_id,tema_numero" },
    )
    .select("id, materia_id, tema_numero, titulo, resumen_md")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Error al guardar ficha");
  return data as MateriaFichaRow;
}

/** Convierte resumen_md legacy (materias) en filas materia_fichas */
export async function migrateLegacyResumenesToFichas(): Promise<number> {
  if (!(await materiaFichasReady())) return 0;
  const supabase = getSupabase();
  const { data: materias, error } = await supabase
    .from("materias")
    .select("id, resumen_md")
    .not("resumen_md", "is", null);
  if (error) throw error;

  let migrated = 0;
  for (const m of materias ?? []) {
    const md = m.resumen_md?.trim();
    if (!md) continue;
    for (const chunk of splitLegacyMateriaResumen(md)) {
      const tema = parseTemaFromMarkdown(chunk);
      if (!tema) continue;
      const { count } = await supabase
        .from("materia_fichas")
        .select("*", { count: "exact", head: true })
        .eq("materia_id", m.id)
        .eq("tema_numero", tema);
      if ((count ?? 0) > 0) continue;
      await upsertMateriaFicha({
        materiaId: m.id,
        temaNumero: tema,
        titulo: parseTituloFromMarkdown(chunk, tema),
        resumenMd: chunk,
      });
      migrated++;
    }
  }
  return migrated;
}
