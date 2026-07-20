import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SCHEMA_CACHE_SECONDS } from "@/lib/content-cache";
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

function withSchemaCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, [`schema-${key}`], {
    revalidate: SCHEMA_CACHE_SECONDS,
    tags: [CACHE_TAGS.schema],
  })();
}

async function uncachedPreguntasTableExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("preguntas")
    .select("id", { head: true, count: "exact" })
    .limit(0);

  if (!error) return true;
  return !isTableMissingMessage(error.message);
}

export function preguntasTableExists(): Promise<boolean> {
  return withSchemaCache("preguntas", uncachedPreguntasTableExists);
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

async function uncachedSupuestosTableExists(): Promise<boolean> {
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

export function supuestosTableExists(): Promise<boolean> {
  return withSchemaCache("supuestos", uncachedSupuestosTableExists);
}

async function uncachedSupuestosSchemaReady(): Promise<boolean> {
  if (!(await uncachedSupuestosTableExists())) return false;
  const supabase = getSupabase();
  const { error } = await supabase.from("preguntas").select("supuesto_id").limit(0);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !(msg.includes("supuesto_id") && msg.includes("does not exist"));
}

export function supuestosSchemaReady(): Promise<boolean> {
  return withSchemaCache("supuestos-ready", uncachedSupuestosSchemaReady);
}

async function uncachedPreguntasRpcReady(): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("preguntas_counts_by_banco");
  return !error && Array.isArray(data);
}

export function preguntasRpcReady(): Promise<boolean> {
  return withSchemaCache("preguntas-rpc", uncachedPreguntasRpcReady);
}
