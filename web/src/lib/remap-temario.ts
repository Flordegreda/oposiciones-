import type { SupabaseClient } from "@supabase/supabase-js";
import { MATERIAS_ORDEN_SQL } from "@/lib/db/materias-orden-sql";
import { runSql } from "@/lib/db/postgres";
import {
  TEMARIO_CATALOGO,
  TEMARIO_OTROS,
  displayMateriaNombre,
  matchTemarioFolder,
  type TemarioFolder,
} from "@/lib/temario-catalogo";

const PAGE = 1000;

export type RemapContentKind = "banco" | "mazo";

export type RemapMove = {
  kind: RemapContentKind;
  id: string;
  nombre: string;
  fromMateriaId: string;
  fromMateriaNombre: string;
  toOrden: number;
  toNombre: string;
  changed: boolean;
  reason: "nombre" | "materia" | "otros";
};

export type RemapSnapshot = {
  materias: { id: string; nombre: string }[];
  bancos: { id: string; nombre: string; materia_id: string }[];
  mazos: { id: string; nombre: string; materia_id: string }[];
};

export type RemapPlan = {
  catalogo: Array<{ orden: number; nombre: string }>;
  create: Array<{ orden: number; nombre: string }>;
  keep: Array<{ id: string; orden: number; fromNombre: string; toNombre: string }>;
  merge: Array<{
    fromId: string;
    fromNombre: string;
    intoNombre: string;
    orden: number;
  }>;
  delete: Array<{ id: string; nombre: string }>;
  moves: RemapMove[];
  bancosAMover: number;
  mazosAMover: number;
  porCarpeta: Array<{
    orden: number;
    nombre: string;
    bancos: number;
    mazos: number;
  }>;
};

function materiaNombreById(materias: RemapSnapshot["materias"], id: string): string {
  return materias.find((m) => m.id === id)?.nombre ?? "Sin materia";
}

function contentCount(snapshot: RemapSnapshot, materiaId: string): number {
  let n = 0;
  for (const b of snapshot.bancos) if (b.materia_id === materiaId) n += 1;
  for (const z of snapshot.mazos) if (z.materia_id === materiaId) n += 1;
  return n;
}

function pickKeeper(
  candidates: { id: string; nombre: string }[],
  snapshot: RemapSnapshot,
  folder: TemarioFolder,
): { id: string; nombre: string } {
  const canonical = displayMateriaNombre(folder);
  const exact = candidates.find((c) => c.nombre.trim() === canonical);
  if (exact) return exact;
  return [...candidates].sort(
    (a, b) => contentCount(snapshot, b.id) - contentCount(snapshot, a.id) || a.id.localeCompare(b.id),
  )[0]!;
}

function describeMove(
  kind: RemapContentKind,
  row: { id: string; nombre: string; materia_id: string },
  materias: RemapSnapshot["materias"],
): RemapMove {
  const fromNombre = materiaNombreById(materias, row.materia_id);
  const byNombre = matchTemarioFolder(row.nombre);
  const byMateria = matchTemarioFolder(fromNombre);
  const folder = byNombre ?? byMateria ?? TEMARIO_OTROS;
  const reason: RemapMove["reason"] = byNombre ? "nombre" : byMateria ? "materia" : "otros";
  const toNombre = displayMateriaNombre(folder);
  return {
    kind,
    id: row.id,
    nombre: row.nombre,
    fromMateriaId: row.materia_id,
    fromMateriaNombre: fromNombre,
    toOrden: folder.orden,
    toNombre,
    changed: fromNombre.trim() !== toNombre,
    reason,
  };
}

export function planTemarioRemap(snapshot: RemapSnapshot): RemapPlan {
  const slots = new Map<number, { id: string; nombre: string }[]>();
  for (const folder of TEMARIO_CATALOGO) slots.set(folder.orden, []);

  for (const materia of snapshot.materias) {
    const folder = matchTemarioFolder(materia.nombre);
    if (!folder) continue;
    slots.get(folder.orden)!.push(materia);
  }

  const keep: RemapPlan["keep"] = [];
  const merge: RemapPlan["merge"] = [];
  const create: RemapPlan["create"] = [];
  const keepIds = new Set<string>();

  for (const folder of TEMARIO_CATALOGO) {
    const toNombre = displayMateriaNombre(folder);
    const candidates = slots.get(folder.orden) ?? [];
    if (candidates.length === 0) {
      create.push({ orden: folder.orden, nombre: toNombre });
      continue;
    }
    const keeper = pickKeeper(candidates, snapshot, folder);
    keepIds.add(keeper.id);
    keep.push({
      id: keeper.id,
      orden: folder.orden,
      fromNombre: keeper.nombre,
      toNombre,
    });
    for (const extra of candidates) {
      if (extra.id === keeper.id) continue;
      merge.push({
        fromId: extra.id,
        fromNombre: extra.nombre,
        intoNombre: toNombre,
        orden: folder.orden,
      });
    }
  }

  const moves = [
    ...snapshot.bancos.map((b) => describeMove("banco", b, snapshot.materias)),
    ...snapshot.mazos.map((z) => describeMove("mazo", z, snapshot.materias)),
  ];

  const deleteList = snapshot.materias
    .filter((m) => !keepIds.has(m.id))
    .map((m) => ({ id: m.id, nombre: m.nombre }));

  const porCarpeta = TEMARIO_CATALOGO.map((folder) => {
    const toNombre = displayMateriaNombre(folder);
    const here = moves.filter((m) => m.toOrden === folder.orden);
    return {
      orden: folder.orden,
      nombre: toNombre,
      bancos: here.filter((m) => m.kind === "banco").length,
      mazos: here.filter((m) => m.kind === "mazo").length,
    };
  });

  return {
    catalogo: TEMARIO_CATALOGO.map((f) => ({
      orden: f.orden,
      nombre: displayMateriaNombre(f),
    })),
    create,
    keep,
    merge,
    delete: deleteList,
    moves,
    bancosAMover: moves.filter((m) => m.kind === "banco" && m.changed).length,
    mazosAMover: moves.filter((m) => m.kind === "mazo" && m.changed).length,
    porCarpeta,
  };
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function fetchTemarioSnapshot(supabase: SupabaseClient): Promise<RemapSnapshot> {
  const [materias, bancos, mazos] = await Promise.all([
    fetchAllRows<{ id: string; nombre: string }>(supabase, "materias", "id, nombre"),
    fetchAllRows<{ id: string; nombre: string; materia_id: string }>(
      supabase,
      "bancos",
      "id, nombre, materia_id",
    ),
    fetchAllRows<{ id: string; nombre: string; materia_id: string }>(
      supabase,
      "mazos_fichas",
      "id, nombre, materia_id",
    ).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (/mazos_fichas|does not exist|could not find/i.test(msg)) return [];
      throw e;
    }),
  ]);
  return { materias, bancos, mazos };
}

export async function ensureMateriasOrdenColumn(dbPassword?: string): Promise<boolean> {
  try {
    await runSql(MATERIAS_ORDEN_SQL, dbPassword);
    return true;
  } catch {
    return false;
  }
}

async function upsertSlot(
  supabase: SupabaseClient,
  folder: TemarioFolder,
  existingId: string | undefined,
  hasOrden: boolean,
): Promise<string> {
  const nombre = displayMateriaNombre(folder);

  if (existingId) {
    const updated = hasOrden
      ? await supabase.from("materias").update({ nombre, orden: folder.orden }).eq("id", existingId)
      : await supabase.from("materias").update({ nombre }).eq("id", existingId);
    if (updated.error) {
      if (hasOrden && /orden/i.test(updated.error.message)) {
        const retry = await supabase.from("materias").update({ nombre }).eq("id", existingId);
        if (retry.error) throw new Error(retry.error.message);
      } else {
        throw new Error(updated.error.message);
      }
    }
    return existingId;
  }

  const insert = hasOrden
    ? await supabase.from("materias").insert({ nombre, orden: folder.orden }).select("id").single()
    : await supabase.from("materias").insert({ nombre }).select("id").single();
  if (insert.error || !insert.data) {
    if (hasOrden && insert.error && /orden/i.test(insert.error.message)) {
      const retry = await supabase.from("materias").insert({ nombre }).select("id").single();
      if (retry.error || !retry.data) {
        throw new Error(retry.error?.message ?? "Error al crear materia");
      }
      return retry.data.id as string;
    }
    throw new Error(insert.error?.message ?? "Error al crear materia");
  }
  return insert.data.id as string;
}

export async function applyTemarioRemap(
  supabase: SupabaseClient,
  dbPassword?: string,
): Promise<{ plan: RemapPlan; idByOrden: Record<number, string>; hasOrden: boolean }> {
  const hasOrden = await ensureMateriasOrdenColumn(dbPassword);
  const snapshot = await fetchTemarioSnapshot(supabase);
  const plan = planTemarioRemap(snapshot);

  const idByOrden: Record<number, string> = {};
  const keepByOrden = new Map(plan.keep.map((k) => [k.orden, k.id]));

  for (const folder of TEMARIO_CATALOGO) {
    idByOrden[folder.orden] = await upsertSlot(
      supabase,
      folder,
      keepByOrden.get(folder.orden),
      hasOrden,
    );
  }

  for (const move of plan.moves) {
    const targetId = idByOrden[move.toOrden];
    if (!targetId || move.fromMateriaId === targetId) continue;
    const table = move.kind === "banco" ? "bancos" : "mazos_fichas";
    const { error } = await supabase.from(table).update({ materia_id: targetId }).eq("id", move.id);
    if (error) throw new Error(`${move.kind} ${move.nombre}: ${error.message}`);
  }

  const keepIds = new Set(Object.values(idByOrden));
  const leftovers = snapshot.materias.filter((m) => !keepIds.has(m.id));
  for (const leftover of leftovers) {
    const otrosId = idByOrden[33];
    if (otrosId) {
      const movedBancos = await supabase
        .from("bancos")
        .update({ materia_id: otrosId })
        .eq("materia_id", leftover.id);
      if (movedBancos.error) throw new Error(movedBancos.error.message);
      const movedMazos = await supabase
        .from("mazos_fichas")
        .update({ materia_id: otrosId })
        .eq("materia_id", leftover.id);
      if (
        movedMazos.error &&
        !/mazos_fichas|does not exist|could not find/i.test(movedMazos.error.message)
      ) {
        throw new Error(movedMazos.error.message);
      }
    }
    const { error } = await supabase.from("materias").delete().eq("id", leftover.id);
    if (error) throw new Error(`Eliminar ${leftover.nombre}: ${error.message}`);
  }

  return { plan, idByOrden, hasOrden };
}
