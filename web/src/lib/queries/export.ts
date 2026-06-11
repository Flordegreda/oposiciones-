import { getSupabase } from "@/lib/supabase/server";
import { preguntasTableExists } from "@/lib/queries/schema";

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

export async function buildFullBackup(): Promise<BackupPayload> {
  const supabase = getSupabase();
  const hasPreguntas = await preguntasTableExists();

  const bancoSelect = hasPreguntas
    ? "*, bancos(*, preguntas(*))"
    : "*, bancos(*)";

  const [materiasRes, lineasRes] = await Promise.all([
    supabase.from("materias").select(bancoSelect).order("nombre"),
    supabase.from("lineas").select("*").order("nombre"),
  ]);

  if (materiasRes.error) throw new Error(materiasRes.error.message);
  if (lineasRes.error) throw new Error(lineasRes.error.message);

  const materias = (materiasRes.data ?? []) as Record<string, unknown>[];
  const lineas = (lineasRes.data ?? []) as Record<string, unknown>[];

  let bancos = 0;
  let preguntas = 0;
  for (const m of materias) {
    const bs = (m.bancos as Record<string, unknown>[] | null) ?? [];
    bancos += bs.length;
    for (const b of bs) {
      preguntas += ((b.preguntas as unknown[] | null) ?? []).length;
    }
  }

  return {
    format: "oposiciones-jex-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    stats: {
      materias: materias.length,
      bancos,
      preguntas,
      lineas: lineas.length,
    },
    lineas,
    materias,
  };
}
