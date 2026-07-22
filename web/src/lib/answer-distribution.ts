import { shuffle } from "@/lib/exam-utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export type AnswerDistribution = {
  total: number;
  counts: number[]; // index = letter
  percents: number[];
  /** Letra más frecuente (0=A). */
  dominant: number;
  /** % de la letra dominante. */
  dominantPercent: number;
  /** true si una letra ≥ umbral y hay suficientes preguntas. */
  skewed: boolean;
  /** Preguntas con textos de opción duplicados. */
  duplicateOptionIds: string[];
};

export type RebalanceResult = {
  id: string;
  opciones: string[];
  respuesta: number;
  fromLetter: string;
  toLetter: string;
  changed: boolean;
};

const SKEW_THRESHOLD = 0.4;
const SKEW_MIN_QUESTIONS = 8;

export function analyzeAnswerDistribution(
  preguntas: { id: string; opciones: string[]; respuesta: number }[],
  skewThreshold = SKEW_THRESHOLD,
): AnswerDistribution {
  const maxLetters = Math.max(4, ...preguntas.map((p) => p.opciones.length), 0);
  const counts = Array.from({ length: maxLetters }, () => 0);
  const duplicateOptionIds: string[] = [];

  for (const p of preguntas) {
    const r = p.respuesta;
    if (Number.isInteger(r) && r >= 0 && r < counts.length) counts[r] += 1;

    const norms = p.opciones.map((o) => o.trim().toLowerCase()).filter(Boolean);
    if (new Set(norms).size < norms.length) duplicateOptionIds.push(p.id);
  }

  const total = preguntas.length;
  const percents = counts.map((c) => (total ? c / total : 0));
  let dominant = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[dominant]) dominant = i;
  }
  const dominantPercent = percents[dominant] ?? 0;
  const skewed =
    total >= SKEW_MIN_QUESTIONS && dominantPercent >= skewThreshold;

  return {
    total,
    counts,
    percents,
    dominant,
    dominantPercent,
    skewed,
    duplicateOptionIds,
  };
}

export function formatDistribution(dist: AnswerDistribution): string {
  const parts: string[] = [];
  for (let i = 0; i < dist.counts.length; i++) {
    if (dist.counts[i] === 0 && i >= 4) continue;
    const pct = Math.round((dist.percents[i] ?? 0) * 100);
    parts.push(`${LETTERS[i] ?? "?"}: ${dist.counts[i]} (${pct}%)`);
  }
  return parts.join(" · ");
}

/** Mueve la opción correcta al índice destino sin cambiar el texto de las opciones. */
export function moveCorrectToIndex(
  opciones: string[],
  respuesta: number,
  targetIndex: number,
): { opciones: string[]; respuesta: number } {
  const n = opciones.length;
  if (n <= 1) return { opciones: [...opciones], respuesta };
  const from = Math.max(0, Math.min(respuesta, n - 1));
  const to = Math.max(0, Math.min(targetIndex, n - 1));
  if (from === to) return { opciones: [...opciones], respuesta: from };

  const next = [...opciones];
  const [correct] = next.splice(from, 1);
  next.splice(to, 0, correct);
  return { opciones: next, respuesta: to };
}

/**
 * Reparte las respuestas correctas de forma equilibrada entre A/B/C/D…
 * (round-robin barajado). No inventa textos: solo reordena opciones.
 */
export function planOptionRebalance(
  preguntas: { id: string; opciones: string[]; respuesta: number }[],
): RebalanceResult[] {
  if (!preguntas.length) return [];

  const maxOpts = Math.max(...preguntas.map((p) => p.opciones.length), 1);
  const slots = Math.min(4, maxOpts);

  const targets = shuffle(
    preguntas.map((_, i) => i % slots),
  );

  return preguntas.map((p, i) => {
    const from = p.respuesta;
    const target = Math.min(targets[i] ?? 0, Math.max(0, p.opciones.length - 1));
    const moved = moveCorrectToIndex(p.opciones, p.respuesta, target);
    return {
      id: p.id,
      opciones: moved.opciones,
      respuesta: moved.respuesta,
      fromLetter: LETTERS[from] ?? "?",
      toLetter: LETTERS[moved.respuesta] ?? "?",
      changed: from !== moved.respuesta || p.opciones.some((o, idx) => o !== moved.opciones[idx]),
    };
  });
}

export { LETTERS as ANSWER_LETTERS, SKEW_THRESHOLD, SKEW_MIN_QUESTIONS };
