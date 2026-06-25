const FAV_KEY = "opo_jex_favoritos_v1";
const FAILS_KEY = "opo_jex_fails_v1";

type Store = Record<string, string[]>;

export type FalloEntry = {
  bancoId: string;
  preguntaId: string;
};

export type FavoritoEntry = {
  bancoId: string;
  preguntaId: string;
};

let favCache: Set<string> | null = null;

function favKey(bancoId: string, preguntaId: string) {
  return `${bancoId}:${preguntaId}`;
}

function readStore(key: string): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(key: string, data: Store) {
  localStorage.setItem(key, JSON.stringify(data));
}

function storeFromEntries(entries: FalloEntry[]): Store {
  const store: Store = {};
  for (const { bancoId, preguntaId } of entries) {
    if (!store[bancoId]) store[bancoId] = [];
    if (!store[bancoId].includes(preguntaId)) store[bancoId].push(preguntaId);
  }
  return store;
}

function storeFromFavoritos(entries: FavoritoEntry[]): Store {
  return storeFromEntries(entries);
}

export function getAllFalloEntries(): FalloEntry[] {
  const store = readStore(FAILS_KEY);
  const entries: FalloEntry[] = [];
  for (const [bancoId, ids] of Object.entries(store)) {
    for (const preguntaId of ids) entries.push({ bancoId, preguntaId });
  }
  return entries;
}

export function getAllFavoritoEntries(): FavoritoEntry[] {
  if (favCache) {
    return [...favCache].map((k) => {
      const [bancoId, preguntaId] = k.split(":");
      return { bancoId, preguntaId };
    });
  }
  const store = readStore(FAV_KEY);
  const entries: FavoritoEntry[] = [];
  for (const [bancoId, ids] of Object.entries(store)) {
    for (const preguntaId of ids) entries.push({ bancoId, preguntaId });
  }
  return entries;
}

export function getFalloIds(bancoId: string): Set<string> {
  return new Set(readStore(FAILS_KEY)[bancoId] ?? []);
}

export function getGlobalFalloCount(): number {
  return getAllFalloEntries().length;
}

async function postIntento(
  bancoId: string,
  preguntaId: string,
  correcta: boolean,
  dudosa = false,
) {
  try {
    await fetch("/api/progreso/intento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bancoId, preguntaId, correcta, dudosa }),
    });
  } catch {
    /* offline */
  }
}

export function markFallo(bancoId: string, preguntaId: string) {
  const store = readStore(FAILS_KEY);
  const list = new Set(store[bancoId] ?? []);
  list.add(preguntaId);
  store[bancoId] = [...list];
  writeStore(FAILS_KEY, store);
  void postIntento(bancoId, preguntaId, false);
}

export function markAcerto(bancoId: string, preguntaId: string) {
  const store = readStore(FAILS_KEY);
  const list = new Set(store[bancoId] ?? []);
  list.delete(preguntaId);
  if (list.size) store[bancoId] = [...list];
  else delete store[bancoId];
  writeStore(FAILS_KEY, store);
  void postIntento(bancoId, preguntaId, true);
}

export function clearFallos(bancoId: string) {
  const store = readStore(FAILS_KEY);
  delete store[bancoId];
  writeStore(FAILS_KEY, store);
}

export function getFavoritoIds(bancoId: string): Set<string> {
  const ids = new Set<string>();
  for (const e of getAllFavoritoEntries()) {
    if (e.bancoId === bancoId) ids.add(e.preguntaId);
  }
  return ids;
}

export function isFavorito(bancoId: string, preguntaId: string): boolean {
  if (favCache) return favCache.has(favKey(bancoId, preguntaId));
  return getFavoritoIds(bancoId).has(preguntaId);
}

export async function toggleFavorito(bancoId: string, preguntaId: string): Promise<boolean> {
  const store = readStore(FAV_KEY);
  const list = new Set(store[bancoId] ?? []);
  const wasFav = list.has(preguntaId);
  if (wasFav) list.delete(preguntaId);
  else list.add(preguntaId);
  if (list.size) store[bancoId] = [...list];
  else delete store[bancoId];
  writeStore(FAV_KEY, store);

  if (favCache) {
    const k = favKey(bancoId, preguntaId);
    if (wasFav) favCache.delete(k);
    else favCache.add(k);
  }

  try {
    const res = await fetch("/api/progreso/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bancoId, preguntaId }),
    });
    const data = (await res.json()) as { isFavorito?: boolean };
    if (typeof data.isFavorito === "boolean") return data.isFavorito;
  } catch {
    /* local ok */
  }
  return !wasFav;
}

export async function syncProgressWithServer(): Promise<{
  ready: boolean;
  fallos: number;
  favoritos: number;
}> {
  if (typeof window === "undefined") {
    return { ready: false, fallos: 0, favoritos: 0 };
  }

  const localFallos = getAllFalloEntries();
  if (localFallos.length) {
    try {
      await fetch("/api/progreso/fallos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentos: localFallos.map((e) => ({
            bancoId: e.bancoId,
            preguntaId: e.preguntaId,
            correcta: false,
          })),
        }),
      });
    } catch {
      /* continue */
    }
  }

  const localFavs = getAllFavoritoEntries();
  if (localFavs.length) {
    try {
      await fetch("/api/progreso/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritos: localFavs }),
      });
    } catch {
      /* continue */
    }
  }

  let fallosCount = getGlobalFalloCount();
  let favCount = localFavs.length;
  let ready = false;

  try {
    const [fallosRes, favRes] = await Promise.all([
      fetch("/api/progreso/fallos"),
      fetch("/api/progreso/favoritos"),
    ]);
    const fallosData = (await fallosRes.json()) as {
      ready?: boolean;
      fallos?: FalloEntry[];
    };
    const favData = (await favRes.json()) as {
      ready?: boolean;
      favoritos?: FavoritoEntry[];
    };

    if (fallosData.ready && fallosData.fallos) {
      writeStore(FAILS_KEY, storeFromEntries(fallosData.fallos));
      fallosCount = fallosData.fallos.length;
      ready = true;
    }

    if (favData.ready && favData.favoritos) {
      writeStore(FAV_KEY, storeFromFavoritos(favData.favoritos));
      favCache = new Set(favData.favoritos.map((f) => favKey(f.bancoId, f.preguntaId)));
      favCount = favData.favoritos.length;
      ready = true;
    }

    window.dispatchEvent(new CustomEvent("opo-progress-synced"));
  } catch {
    /* offline */
  }

  return { ready, fallos: fallosCount, favoritos: favCount };
}
