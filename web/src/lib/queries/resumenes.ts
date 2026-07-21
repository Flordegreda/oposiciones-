import "server-only";

import { resumenPublicUrl } from "@/lib/resumenes-storage";
import type { ResumenPdfItem, ResumenPdfSection } from "@/lib/resumenes-types";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

export type { ResumenPdfItem, ResumenPdfSection };

type DbRow = {
  id: string;
  materia_id: string;
  titulo: string;
  filename: string;
  size_bytes: number;
  storage_path: string;
  materias: { nombre: string } | { nombre: string }[] | null;
};

function materiaNombreFromJoin(m: DbRow["materias"]): string {
  if (!m) return "Sin materia";
  if (Array.isArray(m)) return m[0]?.nombre ?? "Sin materia";
  return m.nombre;
}

function rowToItem(row: DbRow): ResumenPdfItem {
  return {
    id: row.id,
    materiaId: row.materia_id,
    materiaNombre: materiaNombreFromJoin(row.materias),
    titulo: row.titulo,
    filename: row.filename,
    sizeBytes: row.size_bytes,
  };
}

export async function fetchAllResumenes(): Promise<ResumenPdfItem[]> {
  if (!(await resumenesSchemaReady())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_resumenes")
    .select("id, materia_id, titulo, filename, size_bytes, storage_path, materias(nombre)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbRow[]).map(rowToItem);
}

export async function fetchResumenesGrouped(): Promise<ResumenPdfSection[]> {
  const items = await fetchAllResumenes();
  const map = new Map<string, ResumenPdfSection>();

  for (const item of items) {
    if (!map.has(item.materiaId)) {
      map.set(item.materiaId, {
        materiaId: item.materiaId,
        materiaNombre: item.materiaNombre,
        items: [],
      });
    }
    map.get(item.materiaId)!.items.push(item);
  }

  return [...map.values()].sort((a, b) =>
    a.materiaNombre.localeCompare(b.materiaNombre, "es", { sensitivity: "base" }),
  );
}

export async function getResumenById(
  resumenId: string,
): Promise<(ResumenPdfItem & { url: string }) | null> {
  if (!(await resumenesSchemaReady())) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_resumenes")
    .select("id, materia_id, titulo, filename, size_bytes, storage_path, materias(nombre)")
    .eq("id", resumenId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as DbRow;
  return {
    ...rowToItem(row),
    url: resumenPublicUrl(row.storage_path),
  };
}

export async function fetchStoragePathsForMateria(materiaId: string): Promise<string[]> {
  if (!(await resumenesSchemaReady())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_resumenes")
    .select("storage_path")
    .eq("materia_id", materiaId);

  if (error || !data) return [];
  return data.map((r) => r.storage_path);
}
