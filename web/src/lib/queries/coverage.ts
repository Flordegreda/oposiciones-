import "server-only";

import { cache } from "react";
import { coverageStatsFromLists } from "@/lib/coverage-stats";
import type { MaterialStats } from "@/lib/queries/bancos";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { fetchMazosGrouped } from "@/lib/queries/fichas";

/**
 * Fuente única de conteos de cobertura (preguntas, bancos T/P, mazos, fichas).
 * Reutiliza las listas cacheadas de tests y mazos activos con contenido.
 */
export const getCoverageStats = cache(async (): Promise<MaterialStats> => {
  const [{ sections }, fichaSections] = await Promise.all([
    getPracticarData(),
    fetchMazosGrouped(),
  ]);
  return coverageStatsFromLists(sections, fichaSections);
});
