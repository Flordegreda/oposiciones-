import type { MateriaSection, MaterialStats } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { statsFromPracticarSections } from "@/lib/practicar-stats";

export function tallyMazosGrouped(sections: MazoFichasSection[]): {
  mazos: number;
  fichas: number;
  materias: number;
} {
  let mazos = 0;
  let fichas = 0;
  for (const s of sections) {
    for (const m of s.mazos) {
      mazos += 1;
      fichas += m.numFichas;
    }
  }
  return { mazos, fichas, materias: sections.length };
}

/** Totales públicos: mismas listas que /practicar, /temario y /fichas. */
export function coverageStatsFromLists(
  testSections: MateriaSection[],
  fichaSections: MazoFichasSection[],
): MaterialStats {
  const tests = statsFromPracticarSections(testSections);
  const fichasTally = tallyMazosGrouped(fichaSections);
  const materiaIds = new Set<string>();
  for (const s of testSections) materiaIds.add(s.id);
  for (const s of fichaSections) materiaIds.add(s.materiaId);

  return {
    materias: materiaIds.size,
    bancos: tests.bancos,
    preguntas: tests.preguntas,
    teorico: { bancos: tests.bancosTeorico, preguntas: tests.teorico },
    practico: { bancos: tests.bancosPractico, preguntas: tests.practico },
    mazosFichas: fichasTally.mazos,
    fichas: fichasTally.fichas,
    porMateria: [],
  };
}
