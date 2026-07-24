/**
 * Caché en memoria con TTL + deduplicación de peticiones en vuelo.
 * Reduce hits a Supabase en la misma instancia (warm Lambda / Node local).
 * Se invalida junto a revalidateTag vía clearMemoryCache().
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function memoryGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function memorySet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearMemoryCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Ejecuta fn como máximo una vez por clave mientras dura el TTL. */
export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = memoryGet<T>(key);
  if (cached !== undefined) return cached;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const run = (async () => {
    try {
      const value = await fn();
      memorySet(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, run);
  return run;
}
