import "server-only";

import { getSupabase } from "@/lib/supabase/server";

export const RESUMENES_BUCKET = "materia-resumenes";

export function resumenStoragePath(materiaId: string): string {
  return `${materiaId}/resumen.pdf`;
}

export function resumenPublicUrl(storagePath: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(RESUMENES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteResumenFile(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(RESUMENES_BUCKET).remove([storagePath]);
  if (error) throw error;
}
