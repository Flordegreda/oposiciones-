import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, invalidateMemoryContentCache } from "@/lib/content-cache";
import { clearMemoryCache } from "@/lib/ttl-cache";

export function revalidateContentCache() {
  invalidateMemoryContentCache();
  revalidateTag(CACHE_TAGS.temario);
  revalidateTag(CACHE_TAGS.materialStats);
}

export function revalidateSchemaCache() {
  clearMemoryCache();
  revalidateTag(CACHE_TAGS.schema);
}

export function revalidateAllCaches() {
  clearMemoryCache();
  revalidateTag(CACHE_TAGS.temario);
  revalidateTag(CACHE_TAGS.materialStats);
  revalidateTag(CACHE_TAGS.schema);
}

/** Rutas ISR que deben refrescarse tras cambios de contenido. */
export function revalidateAppPaths() {
  for (const path of ["/practicar", "/fichas", "/admin", "/simulacro"] as const) {
    revalidatePath(path);
  }
}

export function revalidateAfterFichasChange() {
  revalidateContentCache();
  revalidatePath("/fichas");
  revalidatePath("/admin");
}
