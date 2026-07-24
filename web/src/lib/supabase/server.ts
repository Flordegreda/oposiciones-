import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { fetchWithRetry } from "@/lib/retry";

let client: SupabaseClient | null = null;

/** fetch de Supabase con backoff ante 503/502/429 (PostgREST / red). */
function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetchWithRetry(input, init, {
    retries: 3,
    baseDelayMs: 250,
    maxDelayMs: 6_000,
  });
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  client = createClient(url, key, {
    global: { fetch: supabaseFetch },
  });
  return client;
}
