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

/** Reparto fijo 80 % teórico · 20 % práctico (como el examen). */
export const SIMULACRO_PRESETS: SimulacroPreset[] = [
  {
    id: "oficial",
    label: "Simulacro oficial",
    description: "80 teóricas + 20 prácticas · 120 minutos",
    teorico: 80,
    practico: 20,
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
  const teoricas = shuffle(all.filter((p) => p.tipo !== "practico"));
  const practicas = shuffle(all.filter((p) => p.tipo === "practico"));

  const teoricasBase = teoricas.slice(0, Math.min(preset.teorico, teoricas.length));
  const practicasBase = practicas.slice(0, Math.min(preset.practico, practicas.length));
  const targetTotal = preset.teorico + preset.practico;

  const listBase = [...teoricasBase, ...practicasBase];
  const usedIds = new Set(listBase.map((p) => p.id));

  // Compensa faltantes con preguntas del otro bloque para mantener tamaño objetivo.
  const faltan = Math.max(0, targetTotal - listBase.length);
  let extras: ExamPregunta[] = [];

  if (faltan > 0) {
    const extraTeoricas = teoricas.filter((p) => !usedIds.has(p.id));
    const extraPracticas = practicas.filter((p) => !usedIds.has(p.id));
    const poolExtras = [...extraTeoricas, ...extraPracticas];
    extras = poolExtras.slice(0, faltan);
  }

  const list = shuffle([...listBase, ...extras]);
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
  return {
    list: [],
    teoricoUsed: Math.min(preset.teorico, pool.teorico),
    practicoUsed: Math.min(preset.practico, pool.practico),
    teoricoTarget: preset.teorico,
    practicoTarget: preset.practico,
  };
}
