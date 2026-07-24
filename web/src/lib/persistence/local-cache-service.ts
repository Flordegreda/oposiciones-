/**
 * Caché local en IndexedDB para listas de bancos, resultados y estadísticas.
 * Solo navegador (client-side).
 */

import type {
  BancoCacheEntry,
  CacheMeta,
  TestResultRecord,
  UserStatsRecord,
} from "@/lib/persistence/types";

const DB_NAME = "jex-oposiciones-cache";
const DB_VERSION = 1;

const STORE = {
  bancos: "bancos",
  resultados: "resultados",
  stats: "stats",
  meta: "meta",
} as const;

const META_KEY = "sync";
const DEVICE_STORAGE_KEY = "jex-usuario-id";

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE.bancos)) {
        db.createObjectStore(STORE.bancos, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.resultados)) {
        const store = db.createObjectStore(STORE.resultados, { keyPath: "id" });
        store.createIndex("byFecha", "fecha");
        store.createIndex("byBanco", "banco");
        store.createIndex("bySync", "syncStatus");
        store.createIndex("byUpdated", "updatedAt");
      }
      if (!db.objectStoreNames.contains(STORE.stats)) {
        db.createObjectStore(STORE.stats, { keyPath: "usuarioId" });
      }
      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.createObjectStore(STORE.meta, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Error al abrir IndexedDB"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transacción IndexedDB fallida"));
    tx.onabort = () => reject(tx.error ?? new Error("Transacción IndexedDB abortada"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Operación IndexedDB fallida"));
  });
}

/** ID anónimo del dispositivo (hasta que exista auth.users). */
export function getOrCreateUsuarioId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export class LocalCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb();
    return this.dbPromise;
  }

  // —— Bancos ————————————————————————————————————————————————

  async saveBancos(bancos: BancoCacheEntry[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE.bancos, "readwrite");
    const store = tx.objectStore(STORE.bancos);
    store.clear();
    const now = new Date().toISOString();
    for (const b of bancos) {
      store.put({ ...b, cachedAt: b.cachedAt || now });
    }
    await txDone(tx);
  }

  async getBancos(): Promise<BancoCacheEntry[]> {
    const db = await this.db();
    const tx = db.transaction(STORE.bancos, "readonly");
    const rows = await reqToPromise(tx.objectStore(STORE.bancos).getAll());
    await txDone(tx);
    return rows ?? [];
  }

  // —— Resultados —————————————————————————————————————————————

  async saveResultado(resultado: TestResultRecord): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE.resultados, "readwrite");
    tx.objectStore(STORE.resultados).put(resultado);
    await txDone(tx);
    await this.markDirty(true);
  }

  async upsertResultados(resultados: TestResultRecord[]): Promise<void> {
    if (!resultados.length) return;
    const db = await this.db();
    const tx = db.transaction(STORE.resultados, "readwrite");
    const store = tx.objectStore(STORE.resultados);
    for (const r of resultados) store.put(r);
    await txDone(tx);
  }

  async getResultado(id: string): Promise<TestResultRecord | undefined> {
    const db = await this.db();
    const tx = db.transaction(STORE.resultados, "readonly");
    const row = await reqToPromise(tx.objectStore(STORE.resultados).get(id));
    await txDone(tx);
    return row as TestResultRecord | undefined;
  }

  async getAllResultados(): Promise<TestResultRecord[]> {
    const db = await this.db();
    const tx = db.transaction(STORE.resultados, "readonly");
    const rows = await reqToPromise(tx.objectStore(STORE.resultados).getAll());
    await txDone(tx);
    return (rows as TestResultRecord[]) ?? [];
  }

  async getPendingResultados(): Promise<TestResultRecord[]> {
    const all = await this.getAllResultados();
    return all.filter((r) => r.syncStatus === "pending" || r.syncStatus === "error");
  }

  async markResultadosSynced(ids: string[], syncedAt = new Date().toISOString()): Promise<void> {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const all = await this.getAllResultados();
    const updated = all.map((row) =>
      idSet.has(row.id)
        ? { ...row, syncStatus: "synced" as const, updatedAt: row.updatedAt || syncedAt }
        : row,
    );
    await this.upsertResultados(updated);
  }

  /**
   * Fusiona nube + local. La nube gana si `updatedAt` es ≥ al local
   * (fuente de verdad ante uso en otro dispositivo).
   */
  async mergeCloudResultados(cloud: TestResultRecord[]): Promise<{
    merged: TestResultRecord[];
    changed: boolean;
  }> {
    const local = await this.getAllResultados();
    const byId = new Map(local.map((r) => [r.id, r]));
    let changed = false;

    for (const remote of cloud) {
      const prev = byId.get(remote.id);
      if (!prev) {
        byId.set(remote.id, { ...remote, syncStatus: "synced" });
        changed = true;
        continue;
      }
      const remoteTs = Date.parse(remote.updatedAt || remote.fecha);
      const localTs = Date.parse(prev.updatedAt || prev.fecha);
      if (remoteTs >= localTs) {
        byId.set(remote.id, { ...remote, syncStatus: "synced" });
        if (
          remote.updatedAt !== prev.updatedAt ||
          remote.aciertos !== prev.aciertos ||
          remote.fallos !== prev.fallos
        ) {
          changed = true;
        }
      }
    }

    const merged = [...byId.values()].sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
    if (changed) await this.upsertResultados(merged);
    return { merged, changed };
  }

  // —— Estadísticas ———————————————————————————————————————————

  async saveStats(stats: UserStatsRecord): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE.stats, "readwrite");
    tx.objectStore(STORE.stats).put(stats);
    await txDone(tx);
  }

  async getStats(usuarioId: string): Promise<UserStatsRecord | null> {
    const db = await this.db();
    const tx = db.transaction(STORE.stats, "readonly");
    const row = await reqToPromise(tx.objectStore(STORE.stats).get(usuarioId));
    await txDone(tx);
    return (row as UserStatsRecord) ?? null;
  }

  /** Recalcula stats locales a partir de todos los resultados guardados. */
  async recomputeStats(usuarioId: string): Promise<UserStatsRecord> {
    const resultados = (await this.getAllResultados()).filter(
      (r) => r.usuarioId === usuarioId,
    );
    const byBanco: UserStatsRecord["byBanco"] = {};
    const dailyMap = new Map<string, { tests: number; aciertos: number; fallos: number }>();

    for (const r of resultados) {
      const slice = byBanco[r.banco] ?? {
        totalTests: 0,
        totalAciertos: 0,
        totalFallos: 0,
        porcentajeAciertos: 0,
        tiempoPromedio: null,
        ultimoTest: null,
      };
      slice.totalTests += 1;
      slice.totalAciertos += r.aciertos;
      slice.totalFallos += r.fallos;
      if (!slice.ultimoTest || r.fecha > slice.ultimoTest) slice.ultimoTest = r.fecha;
      byBanco[r.banco] = slice;

      const day = r.fecha.slice(0, 10);
      const d = dailyMap.get(day) ?? { tests: 0, aciertos: 0, fallos: 0 };
      d.tests += 1;
      d.aciertos += r.aciertos;
      d.fallos += r.fallos;
      dailyMap.set(day, d);
    }

    for (const [banco, slice] of Object.entries(byBanco)) {
      const related = resultados.filter((r) => r.banco === banco);
      const asked = related.reduce((n, r) => n + r.totalPreguntas, 0);
      slice.porcentajeAciertos = asked > 0 ? slice.totalAciertos / asked : 0;
      const times = related
        .map((r) => r.tiempoTotal)
        .filter((t): t is number => typeof t === "number" && t >= 0);
      slice.tiempoPromedio = times.length
        ? times.reduce((a, b) => a + b, 0) / times.length
        : null;
    }

    const now = new Date().toISOString();
    const stats: UserStatsRecord = {
      usuarioId,
      byBanco,
      daily: [...dailyMap.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      computedAt: now,
      updatedAt: now,
    };
    await this.saveStats(stats);
    return stats;
  }

  // —— Meta / dirty flag ——————————————————————————————————————

  async getMeta(): Promise<CacheMeta> {
    const db = await this.db();
    const tx = db.transaction(STORE.meta, "readonly");
    const row = await reqToPromise<{ key: string } & CacheMeta>(
      tx.objectStore(STORE.meta).get(META_KEY),
    );
    await txDone(tx);
    return (
      row ?? {
        lastPullAt: null,
        lastPushAt: null,
        dirty: false,
      }
    );
  }

  async setMeta(patch: Partial<CacheMeta>): Promise<void> {
    const prev = await this.getMeta();
    const next = { ...prev, ...patch };
    const db = await this.db();
    const tx = db.transaction(STORE.meta, "readwrite");
    tx.objectStore(STORE.meta).put({ key: META_KEY, ...next });
    await txDone(tx);
  }

  async markDirty(dirty: boolean): Promise<void> {
    await this.setMeta({ dirty });
  }
}

/** Singleton de navegador. */
let singleton: LocalCacheService | null = null;

export function getLocalCache(): LocalCacheService {
  if (!singleton) singleton = new LocalCacheService();
  return singleton;
}
