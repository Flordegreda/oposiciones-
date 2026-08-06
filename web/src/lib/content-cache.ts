import { unstable_cache } from "next/cache";

/** Segundos de caché para listados (fallback si falla revalidateTag). */
export const CONTENT_CACHE_SECONDS = 60;

export const CACHE_TAGS = {
  temario: "temario",
  materialStats: "material-stats",
  schema: "schema",
} as const;

/** Comprobaciones de tablas/columnas (cambia muy poco). */
export const SCHEMA_CACHE_SECONDS = 3600;

/**
 * Data Cache de Next (`unstable_cache`), invalidable con revalidateTag entre instancias.
 * Sin caché en memoria por instancia: en Vercel provocaba datos obsoletos tras importar.
 */
export function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  tag: string = CACHE_TAGS.temario,
  revalidateSeconds: number = CONTENT_CACHE_SECONDS,
): Promise<T> {
  return unstable_cache(fn, [key], {
    revalidate: revalidateSeconds,
    tags: [tag],
  })();
}

/** Compatibilidad con rutas que ya llamaban a invalidateMemoryContentCache. */
export function invalidateMemoryContentCache(): void {
  /* no-op: ya no hay capa en memoria */
}
