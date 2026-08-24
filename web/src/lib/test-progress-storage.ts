import { questionIdsFingerprint } from "@/lib/exam-session-storage";

const STORAGE_VERSION = 1;

export type TestProgressSnapshot = {
  v: typeof STORAGE_VERSION;
  bancoId: string;
  title: string;
  fingerprint: string;
  questionIds: string[];
  optionMaps: number[][];
  originalOpciones: string[][];
  index: number;
  answers: (number | null)[];
  examMode: boolean;
  updatedAt: number;
};

function storageKey(bancoId: string): string {
  return `jex-test-progress:${bancoId}`;
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function loadTestProgress(bancoId: string): TestProgressSnapshot | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(storageKey(bancoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TestProgressSnapshot;
    if (parsed.v !== STORAGE_VERSION || parsed.bancoId !== bancoId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTestProgress(snap: TestProgressSnapshot): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(storageKey(snap.bancoId), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export function clearTestProgress(bancoId: string): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(storageKey(bancoId));
  } catch {
    /* ignore */
  }
}

export function fingerprintForQuestions(ids: string[]): string {
  return questionIdsFingerprint(ids);
}
