import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/content-cache";

export function revalidateContentCache() {
  revalidateTag(CACHE_TAGS.temario);
  revalidateTag(CACHE_TAGS.materialStats);
}

export function revalidateSchemaCache() {
  revalidateTag(CACHE_TAGS.schema);
}

export function revalidateAllCaches() {
  revalidateContentCache();
  revalidateSchemaCache();
}

/** Rutas ISR que deben refrescarse tras cambios de contenido. */
export function revalidateAppPaths() {
  for (const path of ["/practicar", "/fichas", "/admin", "/simulacro", "/resumenes"] as const) {
    revalidatePath(path);
  }
}

export function revalidateAfterFichasChange() {
  revalidateContentCache();
  revalidatePath("/fichas");
  revalidatePath("/admin");
}
