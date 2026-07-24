import "server-only";

import { cache } from "react";
import { CACHE_TAGS, cachedQuery } from "@/lib/content-cache";
import {
  getAdminPageDataUncached,
  getPracticarDataUncached,
  getBancoForAdmin,
  type AdminPageData,
} from "@/lib/queries/bancos";

/**
 * Lista de tests por materia (Practicar / Simulacro).
 * `cache()` deduplica dentro del mismo request; `cachedQuery` entre requests.
 */
export const getPracticarData = cache(async () => {
  return cachedQuery("get-practicar-data", getPracticarDataUncached, CACHE_TAGS.temario);
});

export async function getAdminPageData(): Promise<AdminPageData> {
  return cachedQuery("get-admin-page-data", getAdminPageDataUncached, CACHE_TAGS.materialStats);
}

/** Test / imprimir: contenido del banco cacheado (admin usa getBancoForAdmin sin caché). */
export const getBancoForTest = cache(async (id: string) => {
  return cachedQuery(`banco-test-${id}`, () => getBancoForAdmin(id), CACHE_TAGS.temario);
});
