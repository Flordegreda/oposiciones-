import type { ExamPregunta } from "@/lib/exam-utils";
import { shuffle } from "@/lib/exam-utils";

export type SupuestoRow = {
  id: string;
  banco_id: string;
  titulo: string | null;
  texto: string;
  orden: number;
};

export type PreguntaWithSupuesto = {
  id: string;
  banco_id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion: string | null;
  orden: number;
  supuesto_id: string | null;
};

export function sortPreguntasWithSupuestos<T extends { orden: number; supuesto_id: string | null }>(
  rows: T[],
  supuestoById: Map<string, SupuestoRow>,
): T[] {
  return [...rows].sort((a, b) => {
    const sa = a.supuesto_id ? supuestoById.get(a.supuesto_id) : null;
    const sb = b.supuesto_id ? supuestoById.get(b.supuesto_id) : null;
    const ga = sa ? sa.orden : a.supuesto_id ? 1_000_000 : a.orden;
    const gb = sb ? sb.orden : b.supuesto_id ? 1_000_000 : b.orden;
    if (ga !== gb) return ga - gb;
    return a.orden - b.orden;
  });
}

export function attachSupuestoToExamPregunta(
  p: PreguntaWithSupuesto,
  supuestoById: Map<string, SupuestoRow>,
  extra?: Partial<ExamPregunta>,
): ExamPregunta {
  const sup = p.supuesto_id ? supuestoById.get(p.supuesto_id) : undefined;
  return {
    id: p.id,
    bancoId: p.banco_id,
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion ?? undefined,
    orden: p.orden,
    supuestoId: p.supuesto_id,
    supuestoTitulo: sup?.titulo ?? undefined,
    supuestoTexto: sup?.texto,
    supuestoOrden: sup?.orden,
    ...extra,
  };
}

type ExamBlock = {
  key: string;
  tipo: "teorico" | "practico";
  questions: ExamPregunta[];
};

function blockTipo(questions: ExamPregunta[]): "teorico" | "practico" {
  return questions[0]?.tipo === "practico" ? "practico" : "teorico";
}

export function buildExamBlocks(all: ExamPregunta[]): ExamBlock[] {
  const standalone: ExamPregunta[] = [];
  const bySupuesto = new Map<string, ExamPregunta[]>();

  for (const p of all) {
    if (p.supuestoId) {
      const list = bySupuesto.get(p.supuestoId) ?? [];
      list.push(p);
      bySupuesto.set(p.supuestoId, list);
    } else {
      standalone.push(p);
    }
  }

  const blocks: ExamBlock[] = [];

  for (const p of standalone) {
    blocks.push({
      key: `p:${p.id}`,
      tipo: blockTipo([p]),
      questions: [p],
    });
  }

  for (const [id, questions] of bySupuesto) {
    const sorted = [...questions].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    blocks.push({
      key: `s:${id}`,
      tipo: blockTipo(sorted),
      questions: sorted,
    });
  }

  return blocks;
}

function countQuestions(blocks: ExamBlock[]): number {
  return blocks.reduce((n, b) => n + b.questions.length, 0);
}

function pickBlocks(blocks: ExamBlock[], target: number): ExamBlock[] {
  const shuffled = shuffle(blocks);
  const picked: ExamBlock[] = [];
  let count = 0;

  for (const block of shuffled) {
    if (count + block.questions.length <= target) {
      picked.push(block);
      count += block.questions.length;
    }
  }

  return picked;
}

/** Mezcla bloques (supuestos enteros o preguntas sueltas) sin romper el orden interno. */
export function pickSimulacroBlocks(
  all: ExamPregunta[],
  teoricoTarget: number,
  practicoTarget: number,
): ExamPregunta[] {
  const blocks = buildExamBlocks(all);
  const teoricoBlocks = blocks.filter((b) => b.tipo !== "practico");
  const practicoBlocks = blocks.filter((b) => b.tipo === "practico");

  const teoricoPicked = pickBlocks(teoricoBlocks, teoricoTarget);
  const practicoPicked = pickBlocks(practicoBlocks, practicoTarget);

  const targetTotal = teoricoTarget + practicoTarget;
  let total = countQuestions(teoricoPicked) + countQuestions(practicoPicked);

  if (total < targetTotal) {
    const used = new Set([...teoricoPicked, ...practicoPicked].map((b) => b.key));
    const extras = shuffle(blocks.filter((b) => !used.has(b.key)));
    const extraPicked: ExamBlock[] = [];

    for (const block of extras) {
      if (total >= targetTotal) break;
      if (total + block.questions.length > targetTotal) continue;
      extraPicked.push(block);
      total += block.questions.length;
    }

    const extraTeorico = extraPicked.filter((b) => b.tipo !== "practico");
    const extraPractico = extraPicked.filter((b) => b.tipo === "practico");
    return shuffle([...teoricoPicked, ...practicoPicked, ...extraTeorico, ...extraPractico]).flatMap(
      (b) => b.questions,
    );
  }

  return shuffle([...teoricoPicked, ...practicoPicked]).flatMap((b) => b.questions);
}
