/** Intentos anulados: no deben reaparecer al sincronizar con la nube. */

const STORAGE_KEY = "jex-voided-resultados";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type VoidEntry = {
  at: number;
  synced?: boolean;
};

type VoidMap = Record<string, VoidEntry>;

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readAll(): VoidMap {
  const s = store();
  if (!s) return {};
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VoidMap;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const next: VoidMap = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry.at !== "number") continue;
      if (now - entry.at > MAX_AGE_MS) continue;
      next[id] = entry;
    }
    return next;
  } catch {
    return {};
  }
}

function writeAll(data: VoidMap): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function isResultadoVoided(id: string): boolean {
  return Boolean(readAll()[id]);
}

export function markResultadoVoided(id: string, synced = false): void {
  if (!id) return;
  const all = readAll();
  all[id] = { at: Date.now(), synced };
  writeAll(all);
}

export function markResultadoVoidSynced(id: string): void {
  const all = readAll();
  const prev = all[id];
  if (!prev) {
    all[id] = { at: Date.now(), synced: true };
  } else {
    all[id] = { ...prev, synced: true };
  }
  writeAll(all);
}

export function getPendingVoidIds(): string[] {
  return Object.entries(readAll())
    .filter(([, e]) => !e.synced)
    .map(([id]) => id);
}

export function getVoidedIdSet(): Set<string> {
  return new Set(Object.keys(readAll()));
}
