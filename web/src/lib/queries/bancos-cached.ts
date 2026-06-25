import "server-only";

import { CACHE_TAGS, cachedQuery } from "@/lib/content-cache";
import {
  getMaterialStatsUncached,
  getPracticarDataUncached,
  type MaterialStats,
} from "@/lib/queries/bancos";

export async function getPracticarData() {
  return cachedQuery("get-practicar-data", getPracticarDataUncached, CACHE_TAGS.temario);
}

export async function getMaterialStats(): Promise<MaterialStats> {
  return cachedQuery("get-material-stats", getMaterialStatsUncached, CACHE_TAGS.materialStats);
}
