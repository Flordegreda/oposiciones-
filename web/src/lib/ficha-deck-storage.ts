import { shuffle } from "@/lib/exam-utils";
import { questionIdsFingerprint } from "@/lib/exam-session-storage";

const STORAGE_VERSION = 2;

type FichaDeckSnapshot = {
  v: typeof STORAGE_VERSION;
  fingerprint: string;
  remainingIds: string[];
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
    if (parsed.v !== STORAGE_VERSION || !Array.isArray(parsed.remainingIds)) return null;
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
};

/** Cola de índices pendientes; restaura si el mazo no ha cambiado. */
export function beginFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
): FichaDeckState {
  if (!cards.length) return { remaining: [] };

  const fingerprint = questionIdsFingerprint(cards.map((c) => c.id));
  const indexById = new Map(cards.map((c, i) => [c.id, i]));

  const saved = loadSnapshot(scope);
  if (saved?.fingerprint === fingerprint) {
    const remaining: number[] = [];
    for (const id of saved.remainingIds) {
      const idx = indexById.get(id);
      if (idx === undefined) {
        break;
      }
      remaining.push(idx);
    }
    if (remaining.length === saved.remainingIds.length) {
      return { remaining };
    }
  }

  const shuffledIds = shuffle(cards.map((c) => c.id));
  saveSnapshot(scope, { v: STORAGE_VERSION, fingerprint, remainingIds: shuffledIds });
  return { remaining: shuffledIds.map((id) => indexById.get(id)!) };
}

export function persistFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
  remaining: number[],
): void {
  if (!cards.length) return;
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint: questionIdsFingerprint(cards.map((c) => c.id)),
    remainingIds: remaining.map((i) => cards[i]!.id),
  });
}
