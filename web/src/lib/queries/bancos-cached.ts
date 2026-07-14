import "server-only";

import { CACHE_TAGS, cachedQuery } from "@/lib/content-cache";
import {
  getAdminPageDataUncached,
  getMaterialStatsUncached,
  getPracticarDataUncached,
  getBancoForAdmin,
  type AdminPageData,
  type MaterialStats,
} from "@/lib/queries/bancos";

export async function getPracticarData() {
  return cachedQuery("get-practicar-data", getPracticarDataUncached, CACHE_TAGS.temario);
}

export async function getMaterialStats(): Promise<MaterialStats> {
  return cachedQuery("get-material-stats", getMaterialStatsUncached, CACHE_TAGS.materialStats);
}

export async function getAdminPageData(): Promise<AdminPageData> {
  return cachedQuery("get-admin-page-data", getAdminPageDataUncached, CACHE_TAGS.materialStats);
}

/** Test / imprimir: contenido del banco cacheado (admin usa getBancoForAdmin sin caché). */
export async function getBancoForTest(id: string) {
  return cachedQuery(`banco-test-${id}`, () => getBancoForAdmin(id), CACHE_TAGS.temario);
}
