import { getSupabase } from "@/lib/supabase/server";
import { favoritosTableExists } from "@/lib/queries/schema";

export type FavoritoRef = {
  bancoId: string;
  preguntaId: string;
};

export async function listFavoritos(): Promise<FavoritoRef[]> {
  if (!(await favoritosTableExists())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("favoritos")
    .select("banco_id, pregunta_id")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    bancoId: r.banco_id,
    preguntaId: r.pregunta_id,
  }));
}

export async function toggleFavoritoDb(
  bancoId: string,
  preguntaId: string,
): Promise<boolean> {
  if (!(await favoritosTableExists())) {
    return false;
  }

  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("favoritos")
    .select("pregunta_id")
    .eq("banco_id", bancoId)
    .eq("pregunta_id", preguntaId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favoritos")
      .delete()
      .eq("banco_id", bancoId)
      .eq("pregunta_id", preguntaId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("favoritos").insert({
    banco_id: bancoId,
    pregunta_id: preguntaId,
  });
  if (error) throw error;
  return true;
}

export async function syncFavoritos(items: FavoritoRef[]): Promise<number> {
  if (!(await favoritosTableExists()) || !items.length) return 0;

  const supabase = getSupabase();
  let inserted = 0;
  for (const { bancoId, preguntaId } of items) {
    const { error } = await supabase.from("favoritos").upsert(
      { banco_id: bancoId, pregunta_id: preguntaId },
      { onConflict: "banco_id,pregunta_id", ignoreDuplicates: true },
    );
    if (!error) inserted++;
  }
  return inserted;
}
