import "server-only";

import { resumenPublicUrl } from "@/lib/resumenes-storage";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

export type MateriaResumenMeta = {
  materiaId: string;
  filename: string;
  sizeBytes: number;
  storagePath: string;
  url: string;
};

export type MateriaResumenPublic = {
  materiaId: string;
  materiaNombre: string;
  filename: string;
  sizeBytes: number;
  url: string;
};

function rowToMeta(row: {
  materia_id: string;
  filename: string;
  size_bytes: number;
  storage_path: string;
}): MateriaResumenMeta {
  return {
    materiaId: row.materia_id,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    url: resumenPublicUrl(row.storage_path),
  };
}

export async function fetchResumenesMap(): Promise<Map<string, MateriaResumenMeta>> {
  const map = new Map<string, MateriaResumenMeta>();
  if (!(await resumenesSchemaReady())) return map;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_resumenes")
    .select("materia_id, filename, size_bytes, storage_path");

  if (error) return map;

  for (const row of data ?? []) {
    map.set(row.materia_id, rowToMeta(row));
  }
  return map;
}

export async function getResumenForMateria(
  materiaId: string,
): Promise<MateriaResumenPublic | null> {
  if (!(await resumenesSchemaReady())) return null;

  const supabase = getSupabase();
  const { data: resumen, error } = await supabase
    .from("materia_resumenes")
    .select("materia_id, filename, size_bytes, storage_path")
    .eq("materia_id", materiaId)
    .maybeSingle();

  if (error || !resumen) return null;

  const { data: materia } = await supabase
    .from("materias")
    .select("nombre")
    .eq("id", materiaId)
    .maybeSingle();

  const meta = rowToMeta(resumen);
  return {
    materiaId: meta.materiaId,
    materiaNombre: materia?.nombre ?? "Materia",
    filename: meta.filename,
    sizeBytes: meta.sizeBytes,
    url: meta.url,
  };
}

