import { shuffle } from "@/lib/exam-utils";
import { questionIdsFingerprint } from "@/lib/exam-session-storage";

const STORAGE_VERSION = 3;

type FichaDeckSnapshot = {
  v: number;
  fingerprint: string;
  remainingIds: string[];
  cursor?: number;
  completed?: boolean;
  known?: number;
  unknown?: number;
};

function storageKey(scope: string): string {
  return `jex-ficha-deck:${scope}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function clearFichaDeckSession(scope: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(storageKey(scope));
  } catch {
    /* quota / private mode */
  }
}

function loadSnapshot(scope: string): FichaDeckSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FichaDeckSnapshot;
    if ((parsed.v !== 2 && parsed.v !== STORAGE_VERSION) || !Array.isArray(parsed.remainingIds)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(scope: string, snap: FichaDeckSnapshot): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(storageKey(scope), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export type FichaDeckState = {
  remaining: number[];
  cursor: number;
  completed?: boolean;
  known?: number;
  unknown?: number;
};

function clampCursor(cursor: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(cursor, length - 1));
}

/** Cola de índices pendientes; restaura si el mazo no ha cambiado. */
export function beginFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
): FichaDeckState {
  if (!cards.length) return { remaining: [], cursor: 0 };

  const fingerprint = questionIdsFingerprint(cards.map((c) => c.id));
  const indexById = new Map(cards.map((c, i) => [c.id, i]));

  const saved = loadSnapshot(scope);
  if (saved) {
    if (saved.completed || saved.remainingIds.length === 0) {
      return {
        remaining: [],
        cursor: 0,
        completed: true,
        known: saved.known ?? cards.length,
        unknown: saved.unknown ?? 0,
      };
    }
    const remaining: number[] = [];
    for (const id of saved.remainingIds) {
      const idx = indexById.get(id);
      if (idx !== undefined) remaining.push(idx);
    }
    if (remaining.length > 0) {
      return {
        remaining,
        cursor: clampCursor(saved.cursor ?? 0, remaining.length),
        unknown: saved.unknown ?? 0,
      };
    }
  }

  const shuffledIds = shuffle(cards.map((c) => c.id));
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint,
    remainingIds: shuffledIds,
    cursor: 0,
  });
  return { remaining: shuffledIds.map((id) => indexById.get(id)!), cursor: 0 };
}

export function persistFichaDeckCompleted(
  scope: string,
  cards: { id: string }[],
  known: number,
  unknown: number,
): void {
  if (!cards.length) return;
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint: questionIdsFingerprint(cards.map((c) => c.id)),
    remainingIds: [],
    cursor: 0,
    completed: true,
    known,
    unknown,
  });
}

export function persistFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
  remaining: number[],
  cursor = 0,
  unknown = 0,
): void {
  if (!cards.length || remaining.length === 0) return;
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint: questionIdsFingerprint(cards.map((c) => c.id)),
    remainingIds: remaining.map((i) => cards[i]!.id),
    cursor: clampCursor(cursor, remaining.length),
    unknown,
  });
}
