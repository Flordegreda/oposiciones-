import { getSupabase } from "@/lib/supabase/server";
import { fetchPreguntaCountsByBanco } from "@/lib/queries/bancos";

export type ImportGapReason =
  | "likely_missing"
  | "likely_missing_60"
  | "name_mismatch";

export type ImportGapRow = {
  id: string;
  nombre: string;
  materiaId: string;
  materiaNombre: string;
  numPreguntas: number;
  reason: ImportGapReason;
  hint: string;
};

function modeCount(counts: number[], targets: number[]): number | null {
  let best: number | null = null;
  let bestN = 0;
  for (const t of targets) {
    const n = counts.filter((c) => c === t).length;
    if (n > bestN) {
      bestN = n;
      best = t;
    }
  }
  return bestN >= 2 ? best : null;
}

function isSplitRemainder(nombre: string, n: number, blockSize: number): boolean {
  if (!/\(\d+\/\d+\)/.test(nombre)) return false;
  return n > 0 && n < blockSize * 0.85;
}

/** Bancos que podrían haber perdido preguntas al importar (heurística). */
export async function findImportGapBancos(): Promise<ImportGapRow[]> {
  const supabase = getSupabase();
  const { data: bancos, error } = await supabase
    .from("bancos")
    .select("id, nombre, materia_id, materias(nombre)")
    .order("nombre");

  if (error) throw error;

  const counts = await fetchPreguntaCountsByBanco();
  const byMateria = new Map<
    string,
    { id: string; nombre: string; materiaId: string; materiaNombre: string; n: number }[]
  >();

  for (const b of bancos ?? []) {
    const materiaNombre =
      (b.materias as { nombre?: string } | null)?.nombre ?? "Sin materia";
    const n = counts.get(b.id) ?? 0;
    const list = byMateria.get(b.materia_id) ?? [];
    list.push({
      id: b.id,
      nombre: b.nombre,
      materiaId: b.materia_id,
      materiaNombre,
      n,
    });
    byMateria.set(b.materia_id, list);
  }

  const out: ImportGapRow[] = [];

  for (const [, list] of byMateria) {
    const allCounts = list.map((b) => b.n).filter((n) => n > 0);
    const mode50 = modeCount(allCounts, [50]);
    const mode60 = modeCount(allCounts, [60]);

    for (const b of list) {
      if (b.n === 0) continue;

      const paren = b.nombre.match(/\((\d+)\)\s*$/);
      if (paren && parseInt(paren[1], 10) !== b.n) {
        out.push({
          id: b.id,
          nombre: b.nombre,
          materiaId: b.materiaId,
          materiaNombre: b.materiaNombre,
          numPreguntas: b.n,
          reason: "name_mismatch",
          hint: `El nombre indica ${paren[1]} preguntas pero hay ${b.n}. Reimporta o renombra.`,
        });
        continue;
      }

      if (mode50 && b.n >= 47 && b.n <= 49 && !isSplitRemainder(b.nombre, b.n, 50)) {
        out.push({
          id: b.id,
          nombre: b.nombre,
          materiaId: b.materiaId,
          materiaNombre: b.materiaNombre,
          numPreguntas: b.n,
          reason: "likely_missing",
          hint: `En ${b.materiaNombre} lo habitual son bloques de 50; este tiene ${b.n}. Reimporta el texto original en Importar.`,
        });
        continue;
      }

      if (mode60 && b.n === 59 && !isSplitRemainder(b.nombre, b.n, 60)) {
        out.push({
          id: b.id,
          nombre: b.nombre,
          materiaId: b.materiaId,
          materiaNombre: b.materiaNombre,
          numPreguntas: b.n,
          reason: "likely_missing_60",
          hint: `Bloques de 60 en ${b.materiaNombre}; este tiene 59. Reimporta si el original tenía 60.`,
        });
      }
    }
  }

  return out.sort(
    (a, b) =>
      a.materiaNombre.localeCompare(b.materiaNombre, "es", { sensitivity: "base" }) ||
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}
