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

export async function intentosTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("intentos")
    .select("id, pregunta_id, banco_id, correcta")
    .limit(0);

  if (!error) return true;
  const msg = error.message.toLowerCase();
  if (
    msg.includes("could not find the table") ||
    msg.includes('relation "intentos" does not exist') ||
    (msg.includes("intentos") && msg.includes("does not exist"))
  ) {
    return false;
  }
  if (msg.includes("pregunta_id") || msg.includes("column")) return false;
  return false;
}

export async function resultadosTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from("resultados").select("id").limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(
    msg.includes("could not find the table") ||
    msg.includes('relation "resultados" does not exist') ||
    (msg.includes("resultados") && msg.includes("does not exist"))
  );
}

export async function favoritosTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from("favoritos").select("banco_id").limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(
    msg.includes("could not find the table") ||
    msg.includes('relation "favoritos" does not exist') ||
    (msg.includes("favoritos") && msg.includes("does not exist"))
  );
}

export async function supuestosTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from("supuestos").select("id").limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(
    msg.includes("could not find the table") ||
    msg.includes('relation "supuestos" does not exist') ||
    (msg.includes("supuestos") && msg.includes("does not exist"))
  );
}

export async function supuestosSchemaReady(): Promise<boolean> {
  if (!(await supuestosTableExists())) return false;
  const supabase = getSupabase();
  const { error } = await supabase.from("preguntas").select("supuesto_id").limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(msg.includes("supuesto_id") && msg.includes("does not exist"));
}
