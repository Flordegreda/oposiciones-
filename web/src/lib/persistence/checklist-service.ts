/**
 * Marcas manuales del plan de temario (fichas sin tracking automático).
 * Tests se marcan solos al completar un test (IndexedDB).
 */

const STORAGE_KEY = "jex-temario-checklist";

export type ChecklistMark = {
  done: boolean;
  at: string;
};

function readAll(): Record<string, ChecklistMark> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ChecklistMark>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ChecklistMark>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function mazoChecklistKey(mazoId: string): string {
  return `fichas:${mazoId}`;
}

export function isMazoMarcado(mazoId: string): boolean {
  return readAll()[mazoChecklistKey(mazoId)]?.done ?? false;
}

export function setMazoMarcado(mazoId: string, done: boolean): void {
  const all = readAll();
  const key = mazoChecklistKey(mazoId);
  all[key] = { done, at: new Date().toISOString() };
  writeAll(all);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("jex-progreso-changed"));
  }
}

export function getChecklistMarks(): Record<string, ChecklistMark> {
  return readAll();
}

export function mergeChecklistMarks(remote: Record<string, ChecklistMark>): boolean {
  const local = readAll();
  let changed = false;
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const next: Record<string, ChecklistMark> = { ...local };
  for (const key of keys) {
    const a = local[key];
    const b = remote[key];
    const winner = !a ? b : !b ? a : Date.parse(b.at) >= Date.parse(a.at) ? b : a;
    if (!winner) continue;
    if (a?.done !== winner.done || a?.at !== winner.at) changed = true;
    next[key] = winner;
  }
  if (changed) writeAll(next);
  return changed;
}
