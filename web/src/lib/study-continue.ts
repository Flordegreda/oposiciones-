const KEY = "jex-seguir";

export type SeguirKind = "test" | "ficha";

export type SeguirItem = {
  kind: SeguirKind;
  id: string;
  title: string;
  href: string;
  hint: string;
  updatedAt: number;
};

type SeguirState = {
  v: 1;
  test: SeguirItem | null;
  ficha: SeguirItem | null;
};

function empty(): SeguirState {
  return { v: 1, test: null, ficha: null };
}

function read(): SeguirState {
  if (typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as SeguirState;
    if (parsed.v !== 1) return empty();
    return {
      v: 1,
      test: parsed.test ?? null,
      ficha: parsed.ficha ?? null,
    };
  } catch {
    return empty();
  }
}

function write(state: SeguirState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function getSeguirItems(): SeguirItem[] {
  const s = read();
  return [s.test, s.ficha]
    .filter((x): x is SeguirItem => Boolean(x))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function rememberSeguir(item: Omit<SeguirItem, "updatedAt">): void {
  const s = read();
  const next: SeguirItem = { ...item, updatedAt: Date.now() };
  if (item.kind === "test") s.test = next;
  else s.ficha = next;
  write(s);
}

export function clearSeguir(kind: SeguirKind, id?: string): void {
  const s = read();
  if (kind === "test" && (!id || s.test?.id === id)) s.test = null;
  if (kind === "ficha" && (!id || s.ficha?.id === id)) s.ficha = null;
  write(s);
}
