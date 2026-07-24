import { unstable_cache } from "next/cache";
import { clearMemoryCache, withTtlCache } from "@/lib/ttl-cache";

/** Segundos de caché para listados de tests/temario (10 min). */
export const CONTENT_CACHE_SECONDS = 600;

export const CACHE_TAGS = {
  temario: "temario",
  materialStats: "material-stats",
  schema: "schema",
} as const;

/** Comprobaciones de tablas/columnas (cambia muy poco). */
export const SCHEMA_CACHE_SECONDS = 3600;

const MEMORY_PREFIX = "cq:";

/**
 * Caché en dos capas:
 * 1) Memoria (TTL + dedupe) — evita repetir Supabase en la misma instancia
 * 2) Data Cache de Next (`unstable_cache`) — comparte entre invocaciones en Vercel
 */
export function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  tag: string = CACHE_TAGS.temario,
  revalidateSeconds: number = CONTENT_CACHE_SECONDS,
): Promise<T> {
  const memoryKey = `${MEMORY_PREFIX}${tag}:${key}`;
  return withTtlCache(memoryKey, revalidateSeconds * 1000, () =>
    unstable_cache(fn, [key], {
      revalidate: revalidateSeconds,
      tags: [tag],
    })(),
  );
}

/** Vacía la capa en memoria (llamar al invalidar tags / Limpiar caché). */
export function invalidateMemoryContentCache(): void {
  clearMemoryCache(MEMORY_PREFIX);
}
