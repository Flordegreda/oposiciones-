import type { MateriaSection } from "@/lib/queries/bancos";

export function statsFromPracticarSections(sections: MateriaSection[]) {
  let bancos = 0;
  let preguntas = 0;
  let teorico = 0;
  let practico = 0;
  let bancosTeorico = 0;
  let bancosPractico = 0;

  for (const section of sections) {
    for (const banco of section.bancos) {
      bancos += 1;
      const n = banco.numPreguntas ?? 0;
      preguntas += n;
      if (banco.tipo === "practico") {
        practico += n;
        bancosPractico += 1;
      } else {
        teorico += n;
        bancosTeorico += 1;
      }
    }
  }

  return {
    bancos,
    preguntas,
    teorico,
    practico,
    bancosTeorico,
    bancosPractico,
    materias: sections.length,
  };
}
