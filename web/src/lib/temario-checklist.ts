import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import type { UserStatsRecord } from "@/lib/persistence/types";
import type { ChecklistMark } from "@/lib/persistence/checklist-service";
import { mazoChecklistKey } from "@/lib/persistence/checklist-service";

export type TemarioItemKind = "test" | "fichas";

export type TemarioChecklistItem = {
  id: string;
  kind: TemarioItemKind;
  nombre: string;
  materiaId: string;
  tipo?: string;
  count: number;
  hecho: boolean;
  /** Solo tests: % aciertos medio (0–100). */
  porcentaje: number | null;
  href: string;
  /** Fichas: marca manual en localStorage. */
  manual: boolean;
};

export type TemarioMateriaResumen = {
  materiaId: string;
  materiaNombre: string;
  items: TemarioChecklistItem[];
  total: number;
  hechos: number;
  pctHecho: number;
  testsTotal: number;
  testsHechos: number;
  fichasTotal: number;
  fichasHechas: number;
};

export type TemarioResumenGlobal = {
  materias: TemarioMateriaResumen[];
  totalItems: number;
  hechos: number;
  pctHecho: number;
  testsTotal: number;
  testsHechos: number;
  fichasTotal: number;
  fichasHechas: number;
};

function pctFromRatio(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function testHecho(bancoId: string, stats: UserStatsRecord | null): boolean {
  const slice = stats?.byBanco[bancoId];
  return (slice?.totalTests ?? 0) > 0;
}

function testPorcentaje(bancoId: string, stats: UserStatsRecord | null): number | null {
  const slice = stats?.byBanco[bancoId];
  if (!slice || slice.totalTests === 0) return null;
  return Math.round(slice.porcentajeAciertos * 100);
}

export function construirTemarioChecklist(
  testSections: MateriaSection[],
  fichaSections: MazoFichasSection[],
  stats: UserStatsRecord | null,
  marks: Record<string, ChecklistMark>,
): TemarioResumenGlobal {
  const materiaMap = new Map<
    string,
    { nombre: string; items: TemarioChecklistItem[] }
  >();

  function ensureMateria(id: string, nombre: string) {
    if (!materiaMap.has(id)) {
      materiaMap.set(id, { nombre, items: [] });
    }
    return materiaMap.get(id)!;
  }

  for (const section of testSections) {
    const m = ensureMateria(section.id, section.nombre);
    for (const b of section.bancos) {
      m.items.push({
        id: b.id,
        kind: "test",
        nombre: b.nombre,
        materiaId: section.id,
        tipo: b.tipo,
        count: b.numPreguntas ?? 0,
        hecho: testHecho(b.id, stats),
        porcentaje: testPorcentaje(b.id, stats),
        href: `/test/${b.id}`,
        manual: false,
      });
    }
  }

  for (const section of fichaSections) {
    const m = ensureMateria(section.materiaId, section.materiaNombre);
    for (const mz of section.mazos) {
      if (mz.numFichas <= 0) continue;
      const key = mazoChecklistKey(mz.id);
      m.items.push({
        id: mz.id,
        kind: "fichas",
        nombre: mz.nombre,
        materiaId: section.materiaId,
        count: mz.numFichas,
        hecho: marks[key]?.done ?? false,
        porcentaje: null,
        href: `/fichas/${mz.id}`,
        manual: true,
      });
    }
  }

  const materias: TemarioMateriaResumen[] = [...materiaMap.entries()]
    .map(([materiaId, { nombre, items }]) => {
      items.sort((a, b) => {
        if (a.hecho !== b.hecho) return a.hecho ? 1 : -1;
        if (a.kind !== b.kind) return a.kind === "test" ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, "es");
      });
      const tests = items.filter((i) => i.kind === "test");
      const fichas = items.filter((i) => i.kind === "fichas");
      const hechos = items.filter((i) => i.hecho).length;
      return {
        materiaId,
        materiaNombre: nombre,
        items,
        total: items.length,
        hechos,
        pctHecho: pctFromRatio(hechos, items.length),
        testsTotal: tests.length,
        testsHechos: tests.filter((i) => i.hecho).length,
        fichasTotal: fichas.length,
        fichasHechas: fichas.filter((i) => i.hecho).length,
      };
    })
    .sort((a, b) => a.materiaNombre.localeCompare(b.materiaNombre, "es"));

  let totalItems = 0;
  let hechos = 0;
  let testsTotal = 0;
  let testsHechos = 0;
  let fichasTotal = 0;
  let fichasHechas = 0;

  for (const m of materias) {
    totalItems += m.total;
    hechos += m.hechos;
    testsTotal += m.testsTotal;
    testsHechos += m.testsHechos;
    fichasTotal += m.fichasTotal;
    fichasHechas += m.fichasHechas;
  }

  return {
    materias,
    totalItems,
    hechos,
    pctHecho: pctFromRatio(hechos, totalItems),
    testsTotal,
    testsHechos,
    fichasTotal,
    fichasHechas,
  };
}
