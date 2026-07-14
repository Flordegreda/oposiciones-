import { unstable_cache } from "next/cache";

/** Segundos de caché para listados de temario (5 min). */
export const CONTENT_CACHE_SECONDS = 300;

export const CACHE_TAGS = {
  temario: "temario",
  materialStats: "material-stats",
  schema: "schema",
} as const;

/** Comprobaciones de tablas/columnas (cambia muy poco). */
export const SCHEMA_CACHE_SECONDS = 3600;

export function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  tag: string = CACHE_TAGS.temario,
): Promise<T> {
  return unstable_cache(fn, [key], {
    revalidate: CONTENT_CACHE_SECONDS,
    tags: [tag],
  })();
}
