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
  for (const path of ["/practicar", "/fichas", "/admin", "/simulacro", "/"] as const) {
    revalidatePath(path, "layout");
    revalidatePath(path, "page");
  }
}

export function revalidateAfterFichasChange() {
  revalidateContentCache();
  revalidatePath("/fichas", "layout");
  revalidatePath("/fichas", "page");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin", "page");
}

/** Tras cambios en un banco concreto (import, preguntas, supuesto). */
export function revalidateBancoPaths(bancoId: string) {
  revalidateContentCache();
  revalidateAppPaths();
  revalidatePath(`/test/${bancoId}`, "page");
  revalidatePath(`/test/${bancoId}`, "layout");
  revalidatePath(`/admin/bancos/${bancoId}`, "page");
  revalidatePath(`/admin/bancos/${bancoId}`, "layout");
  revalidatePath(`/imprimir/banco/${bancoId}`, "page");
}
