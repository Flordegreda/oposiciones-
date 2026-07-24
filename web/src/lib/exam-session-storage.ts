import type { PreparedExamSession, PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";

const STORAGE_VERSION = 1;

export type ExamSessionSnapshot = {
  v: typeof STORAGE_VERSION;
  fingerprint: string;
  questionIds: string[];
  optionMaps: number[][];
  originalOpciones: string[][];
};

export function questionIdsFingerprint(ids: string[]): string {
  return [...ids].sort().join("\0");
}

function storageKey(scope: string): string {
  return `jex-exam-session:${scope}`;
}

export function clearExamSession(scope: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(scope));
  } catch {
    /* quota / private mode */
  }
}

function loadSnapshot(scope: string): ExamSessionSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSessionSnapshot;
    if (parsed.v !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(scope: string, snap: ExamSessionSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

function applySnapshot(
  list: PublicExamPregunta[],
  snap: ExamSessionSnapshot,
): PreparedExamSession | null {
  const fingerprint = questionIdsFingerprint(list.map((q) => q.id));
  if (snap.fingerprint !== fingerprint) return null;

  const byId = new Map(list.map((q) => [q.id, q]));
  const ordered: PublicExamPregunta[] = [];
  for (const id of snap.questionIds) {
    const q = byId.get(id);
    if (!q) return null;
    ordered.push(q);
  }
  if (ordered.length !== list.length) return null;

  const questions = ordered.map((q, i) => {
    const map = snap.optionMaps[i] ?? q.opciones.map((_, j) => j);
    const originals = snap.originalOpciones[i] ?? [...q.opciones];
    return {
      ...q,
      opciones: map.map((origIdx) => originals[origIdx] ?? q.opciones[origIdx]),
    };
  });

  return {
    questions,
    optionMaps: snap.optionMaps,
    originalOpciones: snap.originalOpciones,
  };
}

/** Restaura orden barajado de sessionStorage o crea uno nuevo y lo persiste. */
export function beginExamSession(
  scope: string,
  list: PublicExamPregunta[],
): PreparedExamSession {
  if (!list.length) {
    return { questions: [], optionMaps: [], originalOpciones: [] };
  }

  const fingerprint = questionIdsFingerprint(list.map((q) => q.id));
  const saved = loadSnapshot(scope);
  if (saved) {
    const restored = applySnapshot(list, saved);
    if (restored) return restored;
  }

  const prepared = prepareExamSessionQuestions(list);
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint,
    questionIds: prepared.questions.map((q) => q.id),
    optionMaps: prepared.optionMaps,
    originalOpciones: prepared.originalOpciones,
  });
  return prepared;
}

/** Scope estable para simulacro según las preguntas seleccionadas. */
export function simulacroSessionScope(list: PublicExamPregunta[]): string {
  const fp = questionIdsFingerprint(list.map((q) => q.id));
  let hash = 0;
  for (let i = 0; i < fp.length; i++) {
    hash = (hash * 31 + fp.charCodeAt(i)) | 0;
  }
  return `sim:${Math.abs(hash).toString(36)}`;
}
