import { pickSimulacroBlocks } from "@/lib/supuesto-utils";

export type ExamPregunta = {
  id: string;
  bancoId: string;
  tipo?: "teorico" | "practico";
  materiaId?: string;
  materiaNombre?: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string;
  orden?: number;
  supuestoId?: string | null;
  supuestoTitulo?: string | null;
  supuestoTexto?: string | null;
  supuestoOrden?: number | null;
};

/** Pregunta enviada al cliente sin solución (test/simulacro en curso). */
export type PublicExamPregunta = Omit<ExamPregunta, "respuesta" | "explicacion">;

export function stripExamAnswer(p: ExamPregunta): PublicExamPregunta {
  return {
    id: p.id,
    bancoId: p.bancoId,
    tipo: p.tipo,
    materiaId: p.materiaId,
    materiaNombre: p.materiaNombre,
    enunciado: p.enunciado,
    opciones: p.opciones,
    orden: p.orden,
    supuestoId: p.supuestoId,
    supuestoTitulo: p.supuestoTitulo,
    supuestoTexto: p.supuestoTexto,
    supuestoOrden: p.supuestoOrden,
  };
}

export function stripExamAnswers(list: ExamPregunta[]): PublicExamPregunta[] {
  return list.map(stripExamAnswer);
}

export type SimulacroPresetId = "oficial" | "mini";

export type SimulacroPreset = {
  id: SimulacroPresetId;
  label: string;
  description: string;
  teorico: number;
  practico: number;
  minutes: number;
};

/** Reparto fijo 80 % teórico · 20 % práctico (110 preguntas, como el examen JEX). */
export const SIMULACRO_PRESETS: SimulacroPreset[] = [
  {
    id: "oficial",
    label: "Simulacro oficial",
    description: "88 teóricas + 22 prácticas · 110 preguntas · 120 minutos",
    teorico: 88,
    practico: 22,
    minutes: 120,
  },
  {
    id: "mini",
    label: "Mini simulacro",
    description: "16 teóricas + 4 prácticas · 25 minutos",
    teorico: 16,
    practico: 4,
    minutes: 25,
  },
];

export type SimulacroPick = {
  list: ExamPregunta[];
  teoricoUsed: number;
  practicoUsed: number;
  teoricoTarget: number;
  practicoTarget: number;
};

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Baraja opciones y devuelve el nuevo índice de la respuesta correcta. */
export function shuffleQuestionOptions(
  opciones: string[],
  respuesta: number,
): { opciones: string[]; respuesta: number } {
  const n = opciones.length;
  if (n <= 1) return { opciones: [...opciones], respuesta };

  const order = shuffle([...Array(n).keys()]);
  const shuffled = order.map((i) => opciones[i]);
  const newRespuesta = order.indexOf(respuesta);
  return { opciones: shuffled, respuesta: newRespuesta >= 0 ? newRespuesta : respuesta };
}

export type PreparedExamSession = {
  questions: PublicExamPregunta[];
  /** Por pregunta: índice en pantalla → índice original (para corregir). */
  optionMaps: number[][];
  /** Textos originales A/B/C/D antes de barajar (resultados e impresión). */
  originalOpciones: string[][];
};

/** Baraja las opciones de cada pregunta al iniciar test/simulacro. */
export function prepareExamSessionQuestions(list: PublicExamPregunta[]): PreparedExamSession {
  const optionMaps: number[][] = [];
  const originalOpciones: string[][] = [];

  const questions = list.map((q) => {
    const n = q.opciones.length;
    const order = shuffle([...Array(n).keys()]);
    optionMaps.push(order);
    originalOpciones.push([...q.opciones]);
    return {
      ...q,
      opciones: order.map((i) => q.opciones[i]),
    };
  });

  return { questions, optionMaps, originalOpciones };
}

export function displayOptionToOriginal(map: number[], displayIndex: number): number {
  return map[displayIndex] ?? displayIndex;
}

export function originalOptionToDisplay(map: number[], originalIndex: number): number {
  const idx = map.indexOf(originalIndex);
  return idx >= 0 ? idx : originalIndex;
}

export function countByTipo(all: ExamPregunta[]) {
  let teorico = 0;
  let practico = 0;
  for (const p of all) {
    if (p.tipo === "practico") practico++;
    else teorico++;
  }
  return { teorico, practico };
}

export function pickSimulacroMix(
  all: ExamPregunta[],
  presetId: SimulacroPresetId,
): SimulacroPick {
  const preset = SIMULACRO_PRESETS.find((p) => p.id === presetId)!;
  const list = pickSimulacroBlocks(all, preset.teorico, preset.practico);
  const teoricoUsed = list.filter((p) => p.tipo !== "practico").length;
  const practicoUsed = list.length - teoricoUsed;

  return {
    list,
    teoricoUsed,
    practicoUsed,
    teoricoTarget: preset.teorico,
    practicoTarget: preset.practico,
  };
}

export function simulacroTimerSeconds(presetId: SimulacroPresetId, totalPicked: number): number {
  const preset = SIMULACRO_PRESETS.find((p) => p.id === presetId)!;
  const targetTotal = preset.teorico + preset.practico;
  const base = preset.minutes * 60;
  if (totalPicked >= targetTotal) return base;
  return Math.max(120, Math.ceil(base * (totalPicked / targetTotal)));
}

export function formatExamTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function examScore(ok: number, fail: number): string {
  return (ok - fail * 0.25).toFixed(2);
}

export function presetSummary(presetId: SimulacroPresetId, pick: SimulacroPick): string {
  const preset = SIMULACRO_PRESETS.find((p) => p.id === presetId)!;
  const parts = [`${pick.teoricoUsed} teóricas`, `${pick.practicoUsed} prácticas`];
  if (pick.teoricoUsed < preset.teorico || pick.practicoUsed < preset.practico) {
    return `${parts.join(" + ")} (objetivo ${preset.teorico}+${preset.practico})`;
  }
  return parts.join(" + ");
}

/** Estima cuántas preguntas caben en un simulacro sin cargar el enunciado completo. */
export function estimateSimulacroPick(
  pool: { teorico: number; practico: number },
  presetId: SimulacroPresetId,
): SimulacroPick {
  const preset = SIMULACRO_PRESETS.find((p) => p.id === presetId)!;
  const targetTotal = preset.teorico + preset.practico;
  const teoricoBase = Math.min(preset.teorico, pool.teorico);
  const practicoBase = Math.min(preset.practico, pool.practico);
  const faltan = Math.max(0, targetTotal - (teoricoBase + practicoBase));

  // Compensa faltantes con el otro bloque (normalmente teóricas cuando faltan prácticas).
  const extraTeorico = Math.min(faltan, Math.max(0, pool.teorico - teoricoBase));
  const faltanTrasTeorico = faltan - extraTeorico;
  const extraPractico = Math.min(faltanTrasTeorico, Math.max(0, pool.practico - practicoBase));

  return {
    list: [],
    teoricoUsed: teoricoBase + extraTeorico,
    practicoUsed: practicoBase + extraPractico,
    teoricoTarget: preset.teorico,
    practicoTarget: preset.practico,
  };
}
