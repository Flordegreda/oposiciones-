import { shuffle } from "@/lib/exam-utils";
import { questionIdsFingerprint } from "@/lib/exam-session-storage";

const STORAGE_VERSION = 1;

type FichaDeckSnapshot = {
  v: typeof STORAGE_VERSION;
  fingerprint: string;
  fichaIds: string[];
};

function storageKey(scope: string): string {
  return `jex-ficha-deck:${scope}`;
}

export function clearFichaDeckSession(scope: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(scope));
  } catch {
    /* quota / private mode */
  }
}

function loadSnapshot(scope: string): FichaDeckSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FichaDeckSnapshot;
    if (parsed.v !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(scope: string, snap: FichaDeckSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

/** Índices de fichas en orden barajado; restaura de sessionStorage si coincide el mazo. */
export function beginFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
): number[] {
  if (!cards.length) return [];

  const fingerprint = questionIdsFingerprint(cards.map((c) => c.id));
  const indexById = new Map(cards.map((c, i) => [c.id, i]));

  const saved = loadSnapshot(scope);
  if (saved?.fingerprint === fingerprint) {
    const order: number[] = [];
    for (const id of saved.fichaIds) {
      const idx = indexById.get(id);
      if (idx === undefined) break;
      order.push(idx);
    }
    if (order.length === cards.length) return order;
  }

  const shuffledIds = shuffle(cards.map((c) => c.id));
  saveSnapshot(scope, { v: STORAGE_VERSION, fingerprint, fichaIds: shuffledIds });
  return shuffledIds.map((id) => indexById.get(id)!);
}

export function persistFichaDeckOrder(
  scope: string,
  cards: { id: string }[],
  order: number[],
): void {
  if (!cards.length || order.length !== cards.length) return;
  saveSnapshot(scope, {
    v: STORAGE_VERSION,
    fingerprint: questionIdsFingerprint(cards.map((c) => c.id)),
    fichaIds: order.map((i) => cards[i]!.id),
  });
}
