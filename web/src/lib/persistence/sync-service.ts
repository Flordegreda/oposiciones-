/**
 * Sincronización híbrida: IndexedDB (rápido) + Supabase (nube = verdad).
 */

import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import { embedDetalleInRespuestas, extractDetalleFromRespuestas } from "@/lib/persistence/estadisticas-service";
import { fetchWithRetry } from "@/lib/retry";

export type SyncPhase = "idle" | "syncing" | "synced" | "offline" | "error";

type SyncListener = (phase: SyncPhase, detail?: string) => void;

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

type CloudRow = {
  id: string;
  usuario_id: string;
  banco: string;
  test: string;
  fecha: string;
  total_preguntas: number;
  aciertos: number;
  fallos: number;
  tiempo_total: number | null;
  respuestas: Record<string, unknown> | null;
  updated_at: string;
};

function cloudToLocal(row: CloudRow): TestResultRecord {
  const { selecciones, detalle } = extractDetalleFromRespuestas(
    row.respuestas as Record<string, unknown> | null,
  );
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    banco: row.banco,
    test: row.test,
    fecha: row.fecha,
    totalPreguntas: row.total_preguntas,
    aciertos: row.aciertos,
    fallos: row.fallos,
    tiempoTotal: row.tiempo_total,
    respuestas: selecciones,
    detallePreguntas: detalle,
    updatedAt: row.updated_at || row.fecha,
    syncStatus: "synced",
  };
}

function localToCloudPayload(r: TestResultRecord) {
  return {
    id: r.id,
    usuario_id: r.usuarioId,
    banco: r.banco,
    test: r.test,
    fecha: r.fecha,
    total_preguntas: r.totalPreguntas,
    aciertos: r.aciertos,
    fallos: r.fallos,
    tiempo_total: r.tiempoTotal,
    respuestas: embedDetalleInRespuestas(r.respuestas, r.detallePreguntas),
    updated_at: r.updatedAt,
  };
}

export class SyncService {
  private listeners = new Set<SyncListener>();
  private phase: SyncPhase = "idle";
  private timer: number | null = null;
  private running: Promise<void> | null = null;
  private started = false;

  getPhase(): SyncPhase {
    return this.phase;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.phase);
    return () => this.listeners.delete(listener);
  }

  private setPhase(phase: SyncPhase, detail?: string) {
    this.phase = phase;
    for (const l of this.listeners) l(phase, detail);
  }

  /** Arranca pull inicial + intervalo 5 min + beforeunload. */
  start(): void {
    if (typeof window === "undefined" || this.started) return;
    this.started = true;

    void this.syncNow("startup");

    this.timer = window.setInterval(() => {
      void this.syncIfDirty();
    }, SYNC_INTERVAL_MS);

    window.addEventListener("beforeunload", this.onBeforeUnload);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.started = false;
  }

  private onBeforeUnload = () => {
    void this.flushPendingBeacon();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") {
      void this.flushPendingBeacon();
    }
  };

  /** Guarda resultado en IndexedDB al instante y empuja a la nube en background. */
  async saveResultAndEnqueue(input: Omit<TestResultRecord, "usuarioId" | "syncStatus" | "updatedAt"> & {
    usuarioId?: string;
    updatedAt?: string;
  }): Promise<TestResultRecord> {
    const cache = getLocalCache();
    const now = new Date().toISOString();
    const record: TestResultRecord = {
      ...input,
      usuarioId: input.usuarioId ?? getOrCreateUsuarioId(),
      updatedAt: input.updatedAt ?? now,
      syncStatus: "pending",
    };
    await cache.saveResultado(record);
    await cache.recomputeStats(record.usuarioId);

    // Fire-and-forget: no bloquea la UI
    void this.pushPending().then(() => this.setPhase("synced", "Resultado en la nube"));

    return record;
  }

  async syncIfDirty(): Promise<void> {
    const meta = await getLocalCache().getMeta();
    const pending = await getLocalCache().getPendingResultados();
    if (!meta.dirty && pending.length === 0) return;
    await this.syncNow("interval");
  }

  async syncNow(reason: "startup" | "interval" | "manual" = "manual"): Promise<void> {
    void reason;
    if (this.running) return this.running;
    this.running = this.runSync().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runSync(): Promise<void> {
    const cache = getLocalCache();
    const usuarioId = getOrCreateUsuarioId();
    this.setPhase("syncing", "Sincronizando…");

    try {
      await this.pushPending();

      const meta = await cache.getMeta();
      const since = meta.lastPullAt;
      const qs = new URLSearchParams({ usuarioId });
      if (since) qs.set("since", since);

      const res = await fetchWithRetry(`/api/resultados?${qs}`, undefined, {
        retries: 0,
        baseDelayMs: 200,
        maxDelayMs: 1_000,
      });

      if (res.status === 404 || res.status === 503) {
        // Tabla aún no creada: seguir solo en local
        this.setPhase("offline", "Solo local (activa resultados en Material)");
        return;
      }
      if (!res.ok) throw new Error(`Pull falló (${res.status})`);

      const data = (await res.json()) as { resultados?: CloudRow[] };
      const cloud = (data.resultados ?? []).map(cloudToLocal);
      await cache.mergeCloudResultados(cloud);
      await cache.recomputeStats(usuarioId);
      await cache.setMeta({
        lastPullAt: new Date().toISOString(),
        dirty: false,
      });
      this.setPhase("synced", "Sincronizado");
    } catch {
      this.setPhase(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        "No se pudo sincronizar",
      );
    }
  }

  private async pushPending(): Promise<void> {
    const cache = getLocalCache();
    const pending = await cache.getPendingResultados();
    if (!pending.length) return;

    this.setPhase("syncing", "Sincronizando…");

    const res = await fetchWithRetry(
      "/api/resultados",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultados: pending.map(localToCloudPayload),
        }),
      },
      { retries: 2, baseDelayMs: 400, maxDelayMs: 6_000 },
    );

    if (!res.ok) {
      await cache.upsertResultados(
        pending.map((r) => ({ ...r, syncStatus: "error" as const })),
      );
      throw new Error(`Push falló (${res.status})`);
    }

    await cache.markResultadosSynced(pending.map((r) => r.id));
    await cache.setMeta({
      lastPushAt: new Date().toISOString(),
      dirty: false,
    });
  }

  /** Mejor esfuerzo al cerrar pestaña (sendBeacon / fetch keepalive). */
  private flushPendingBeacon(): void {
    void (async () => {
      try {
        const pending = await getLocalCache().getPendingResultados();
        if (!pending.length) return;
        const body = JSON.stringify({
          resultados: pending.map(localToCloudPayload),
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/resultados", blob);
          return;
        }
        void fetch("/api/resultados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      } catch {
        /* ignore unload errors */
      }
    })();
  }
}

let syncSingleton: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncSingleton) syncSingleton = new SyncService();
  return syncSingleton;
}
