import "server-only";

import { fetchMazosFichas } from "@/lib/queries/fichas";
import { revalidateAfterFichasChange } from "@/lib/revalidate-content";
import {
  baseMazoNombre,
  FICHAS_MAX_POR_MAZO,
  mazoNombreParte,
  splitIntoChunks,
} from "@/lib/split-fichas-mazo";
import { getSupabase } from "@/lib/supabase/server";

export type RebalanceFichasOptions = {
  targetSize?: number;
  materiaId?: string | null;
};

export type RebalanceFichasChange = {
  accion: "partir";
  origen: string;
  destino: string[];
  fichas: number;
  sizes: number[];
};

export type RebalanceFichasMateriaPreview = {
  materiaId: string;
  materiaNombre: string;
  mazosAntes: number;
  mazosDespues: number;
  cambios: RebalanceFichasChange[];
};

export type RebalanceFichasPreview = {
  targetSize: number;
  mazosAntes: number;
  mazosDespues: number;
  partir: number;
  sinCambios: number;
  materias: RebalanceFichasMateriaPreview[];
};

const PAGE = 1000;
const UPDATE_CONCURRENCY = 20;

function clampTarget(n: number): number {
  if (!Number.isFinite(n) || n < 20) return FICHAS_MAX_POR_MAZO;
  return Math.min(120, Math.round(n));
}

async function fetchFichaIds(mazoId: string): Promise<{ id: string }[]> {
  const supabase = getSupabase();
  const rows: { id: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("fichas")
      .select("id")
      .eq("mazo_id", mazoId)
      .order("orden", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...(data as { id: string }[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function assignChunk(mazoId: string, chunk: { id: string }[]): Promise<void> {
  const supabase = getSupabase();
  for (let i = 0; i < chunk.length; i += UPDATE_CONCURRENCY) {
    const slice = chunk.slice(i, i + UPDATE_CONCURRENCY);
    const results = await Promise.all(
      slice.map((f, j) =>
        supabase
          .from("fichas")
          .update({ mazo_id: mazoId, orden: i + j })
          .eq("id", f.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
}

export async function splitMazoIntoTandas(
  mazoId: string,
  targetSize = FICHAS_MAX_POR_MAZO,
): Promise<{ mazoIds: string[]; sizes: number[]; base: string }> {
  const size = clampTarget(targetSize);
  const supabase = getSupabase();

  const { data: mazo, error: mErr } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id")
    .eq("id", mazoId)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!mazo) throw new Error("Mazo no encontrado");

  const rows = await fetchFichaIds(mazoId);
  if (rows.length <= size) {
    throw new Error(`Este mazo tiene ${rows.length} fichas (máximo ${size} sin dividir).`);
  }

  const chunks = splitIntoChunks(rows, size);
  const total = chunks.length;
  const base = baseMazoNombre(mazo.nombre as string);
  const now = new Date().toISOString();
  const createdIds: string[] = [mazoId];

  const { error: updErr } = await supabase
    .from("mazos_fichas")
    .update({ nombre: mazoNombreParte(base, 1, total), updated_at: now })
    .eq("id", mazoId);
  if (updErr) throw new Error(updErr.message);

  await assignChunk(mazoId, chunks[0]);

  for (let i = 1; i < chunks.length; i++) {
    const { data: created, error: cErr } = await supabase
      .from("mazos_fichas")
      .insert({
        materia_id: mazo.materia_id,
        nombre: mazoNombreParte(base, i + 1, total),
        active: true,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);
    const newId = created.id as string;
    createdIds.push(newId);
    await assignChunk(newId, chunks[i]);
  }

  for (const id of createdIds) revalidateAfterFichasChange(id);

  return { mazoIds: createdIds, sizes: chunks.map((c) => c.length), base };
}

export async function previewRebalanceFichas(
  opts: RebalanceFichasOptions = {},
): Promise<RebalanceFichasPreview> {
  const targetSize = clampTarget(opts.targetSize ?? FICHAS_MAX_POR_MAZO);
  const mazos = await fetchMazosFichas({ activeOnly: false });
  const filtered = opts.materiaId
    ? mazos.filter((m) => m.materiaId === opts.materiaId)
    : mazos;

  const byMateria = new Map<string, typeof filtered>();
  for (const m of filtered) {
    const list = byMateria.get(m.materiaId) ?? [];
    list.push(m);
    byMateria.set(m.materiaId, list);
  }

  const materias: RebalanceFichasMateriaPreview[] = [];
  let mazosAntes = 0;
  let mazosDespues = 0;
  let partir = 0;
  let sinCambios = 0;

  for (const [materiaId, list] of byMateria) {
    const cambios: RebalanceFichasChange[] = [];
    let despues = 0;

    for (const mazo of list) {
      mazosAntes += 1;
      if (mazo.numFichas <= targetSize) {
        despues += 1;
        sinCambios += 1;
        continue;
      }

      const chunks = splitIntoChunks(
        Array.from({ length: mazo.numFichas }, (_, i) => i),
        targetSize,
      );
      const sizes = chunks.map((c) => c.length);
      const total = sizes.length;
      const base = baseMazoNombre(mazo.nombre);
      cambios.push({
        accion: "partir",
        origen: mazo.nombre,
        destino: sizes.map((_, i) => mazoNombreParte(base, i + 1, total)),
        fichas: mazo.numFichas,
        sizes,
      });
      despues += total;
      partir += 1;
    }

    mazosDespues += despues;
    if (cambios.length) {
      materias.push({
        materiaId,
        materiaNombre: list[0]?.materiaNombre ?? "Materia",
        mazosAntes: list.length,
        mazosDespues: despues,
        cambios,
      });
    }
  }

  materias.sort((a, b) =>
    a.materiaNombre.localeCompare(b.materiaNombre, "es", { sensitivity: "base" }),
  );

  return {
    targetSize,
    mazosAntes,
    mazosDespues,
    partir,
    sinCambios,
    materias,
  };
}

export async function executeRebalanceFichas(
  opts: RebalanceFichasOptions = {},
): Promise<RebalanceFichasPreview> {
  const preview = await previewRebalanceFichas(opts);
  const targetSize = preview.targetSize;
  const mazos = await fetchMazosFichas({ activeOnly: false });
  const filtered = opts.materiaId
    ? mazos.filter((m) => m.materiaId === opts.materiaId)
    : mazos;

  for (const mazo of filtered) {
    if (mazo.numFichas <= targetSize) continue;
    await splitMazoIntoTandas(mazo.id, targetSize);
  }

  revalidateAfterFichasChange();
  return preview;
}
