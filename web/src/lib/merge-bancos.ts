import type { SupabaseClient } from "@supabase/supabase-js";

async function countPreguntas(
  supabase: SupabaseClient,
  bancoId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("preguntas")
    .select("id", { count: "exact", head: true })
    .eq("banco_id", bancoId);
  if (error) throw error;
  return count ?? 0;
}

export type MergeBancosResult = {
  targetName: string;
  keeperId: string;
  removedIds: string[];
  movedPreguntas: number;
};

/** Fusiona bancos duplicados en uno solo (mismo nombre objetivo). */
export async function mergeBancosByIds(
  supabase: SupabaseClient,
  ids: string[],
  targetName: string,
): Promise<MergeBancosResult> {
  if (ids.length < 2) {
    throw new Error("Se necesitan al menos 2 bancos para fusionar");
  }

  const counts = await Promise.all(
    ids.map(async (id) => ({ id, count: await countPreguntas(supabase, id) })),
  );
  counts.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const keeperId = counts[0]!.id;
  const removedIds = ids.filter((id) => id !== keeperId);

  let movedPreguntas = 0;

  for (const duplicateId of removedIds) {
    const { count, error: countErr } = await supabase
      .from("preguntas")
      .select("id", { count: "exact", head: true })
      .eq("banco_id", duplicateId);
    if (countErr) throw countErr;

    const n = count ?? 0;
    if (n > 0) {
      const { error: moveErr } = await supabase
        .from("preguntas")
        .update({ banco_id: keeperId })
        .eq("banco_id", duplicateId);
      if (moveErr) throw moveErr;
      movedPreguntas += n;
    }

    const { error: supErr } = await supabase
      .from("supuestos")
      .update({ banco_id: keeperId })
      .eq("banco_id", duplicateId);
    if (supErr && !supErr.message.includes("Could not find")) {
      throw supErr;
    }

    const { error: delErr } = await supabase.from("bancos").delete().eq("id", duplicateId);
    if (delErr) throw delErr;
  }

  const { error: renameErr } = await supabase
    .from("bancos")
    .update({ nombre: targetName })
    .eq("id", keeperId);
  if (renameErr) throw renameErr;

  return { targetName, keeperId, removedIds, movedPreguntas };
}
