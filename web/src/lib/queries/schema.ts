import { getSupabase } from "@/lib/supabase/server";

function isTableMissingMessage(message: string): boolean {
  const msg = message.toLowerCase();
  if (msg.includes("relationship")) return false;
  return (
    msg.includes("could not find the table") ||
    msg.includes('relation "preguntas" does not exist') ||
    (msg.includes("preguntas") && msg.includes("does not exist"))
  );
}

export function isPreguntasTableMissing(message: string): boolean {
  return isTableMissingMessage(message);
}

export async function preguntasTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("preguntas")
    .select("id", { head: true, count: "exact" })
    .limit(0);

  if (!error) return true;
  return !isTableMissingMessage(error.message);
}

export async function getPreguntasCount(): Promise<number | null> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("preguntas")
    .select("*", { count: "exact", head: true });

  if (error) {
    if (isTableMissingMessage(error.message)) return null;
    return null;
  }
  return count ?? 0;
}
