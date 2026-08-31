/**
 * Sincronización híbrida: IndexedDB (rápido) + Supabase (nube = verdad).
 */

import {
  JEX_ACCOUNT_ID,
  PROGRESO_BANCO,
  PROGRESO_RESULT_ID,
  isProgresoBanco,
} from "@/lib/persistence/account";
import {
  getChecklistMarks,
  mergeChecklistMarks,
  type ChecklistMark,
} from "@/lib/persistence/checklist-service";
import {
  clearPreviousUsuarioId,
  getLocalCache,
  getOrCreateUsuarioId,
  isUsuarioId,
  reassignAllLocalToAccount,
  reassignLocalResultados,
  setUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import { embedDetalleInRespuestas, extractDetalleFromRespuestas } from "@/lib/persistence/estadisticas-service";
import { fetchWithRetry } from "@/lib/retry";

export type SyncPhase = "idle" | "syncing" | "synced" | "offline" | "error";

type SyncListener = (phase: SyncPhase, detail?: string, revision?: number) => void;

const SYNC_INTERVAL_MS = 60 * 1000;

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
  const { selecciones, detalle, tipo } = extractDetalleFromRespuestas(
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
    tipo: tipo ?? (row.banco === "repaso_fallos" ? "repaso_fallos" : "normal"),
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
    respuestas: embedDetalleInRespuestas(r.respuestas, r.detallePreguntas, r.tipo),
    updated_at: r.updatedAt,
  };
}

export class SyncService {
  private listeners = new Set<SyncListener>();
  private phase: SyncPhase = "idle";
  private detail: string | undefined;
  private timer: number | null = null;
  private progresoTimer: number | null = null;
  private running: Promise<void> | null = null;
  private started = false;
  private revision = 0;

  getPhase(): SyncPhase {
    return this.phase;
  }

  getRevision(): number {
    return this.revision;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.phase, this.detail, this.revision);
    return () => this.listeners.delete(listener);
  }

  private setPhase(phase: SyncPhase, detail?: string) {
    this.phase = phase;
    this.detail = detail;
    for (const l of this.listeners) l(phase, detail, this.revision);
  }

  private bumpRevision() {
    this.revision += 1;
    for (const l of this.listeners) l(this.phase, this.detail, this.revision);
  }

  /** Arranca migración a la cuenta común + pull inicial + sync automático. */
  start(): void {
    if (typeof window === "undefined" || this.started) return;
    this.started = true;

    void this.boot();

    this.timer = window.setInterval(() => {
      void this.syncNow("interval");
    }, SYNC_INTERVAL_MS);

    window.addEventListener("beforeunload", this.onBeforeUnload);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("online", this.onOnline);
    window.addEventListener("pageshow", this.onPageShow);
    window.addEventListener("jex-progreso-changed", this.onProgresoChanged);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.progresoTimer !== null) {
      window.clearTimeout(this.progresoTimer);
      this.progresoTimer = null;
    }
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("online", this.onOnline);
    window.removeEventListener("pageshow", this.onPageShow);
    window.removeEventListener("jex-progreso-changed", this.onProgresoChanged);
    this.started = false;
  }

  private async boot(): Promise<void> {
    getOrCreateUsuarioId();
    try {
      const fromIds = await reassignAllLocalToAccount();
      for (const from of fromIds) {
        await this.migrateCloudUsuario(from, JEX_ACCOUNT_ID);
      }
      if (fromIds.length) {
        await getLocalCache().setMeta({ lastPullAt: null, dirty: true });
        this.bumpRevision();
      }
      clearPreviousUsuarioId();
    } catch {
      /* seguir con el pull igual */
    }
    await this.syncNow("startup");
  }

  private onBeforeUnload = () => {
    void this.flushPendingBeacon();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") {
      void this.flushPendingBeacon();
      return;
    }
    void this.syncNow("focus");
  };

  private onOnline = () => {
    void this.syncNow("focus");
  };

  private onPageShow = (e: Event) => {
    if ((e as PageTransitionEvent).persisted) {
      void this.syncNow("focus");
    }
  };

  private onProgresoChanged = () => {
    if (this.progresoTimer !== null) window.clearTimeout(this.progresoTimer);
    this.progresoTimer = window.setTimeout(() => {
      this.progresoTimer = null;
      void this.syncNow("focus");
    }, 700);
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

    void this.syncNow("focus").then(() => this.setPhase("synced", "Resultado en la nube"));

    return record;
  }

  async syncNow(reason: "startup" | "interval" | "manual" | "focus" = "manual"): Promise<void> {
    if (this.running) return this.running;
    this.running = this.runSync(reason).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Une este dispositivo al código de otro (mismo historial de tests). */
  async adoptUsuarioId(raw: string): Promise<void> {
    const newId = raw.trim().toLowerCase();
    if (!isUsuarioId(newId)) {
      throw new Error("El código no es válido.");
    }
    const oldId = getOrCreateUsuarioId();
    if (oldId !== newId) {
      if (this.running) await this.running;
      await reassignLocalResultados(oldId, newId);
      setUsuarioId(newId);
      await getLocalCache().setMeta({ lastPullAt: null, dirty: true });
    }
    await this.syncNow("manual");
  }

  private async migrateCloudUsuario(fromId: string, toId: string): Promise<void> {
    if (!fromId || fromId === toId || !isUsuarioId(fromId) || !isUsuarioId(toId)) return;
    try {
      await fetchWithRetry(
        "/api/resultados",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromUsuarioId: fromId, toUsuarioId: toId }),
        },
        { retries: 1, baseDelayMs: 300, maxDelayMs: 2_000 },
      );
    } catch {
      /* el pull de la cuenta nueva sigue siendo válido */
    }
  }

  private async runSync(reason: "startup" | "interval" | "manual" | "focus"): Promise<void> {
    const cache = getLocalCache();
    const usuarioId = getOrCreateUsuarioId();
    this.setPhase("syncing", "Sincronizando…");

    try {
      const qs = new URLSearchParams({ usuarioId });
      const res = await fetchWithRetry(`/api/resultados?${qs}`, undefined, {
        retries: 0,
        baseDelayMs: 200,
        maxDelayMs: 1_000,
      });

      if (res.status === 404 || res.status === 503) {
        this.setPhase("offline", "Solo local (activa resultados en Material)");
        return;
      }
      if (!res.ok) throw new Error(`Pull falló (${res.status})`);

      const data = (await res.json()) as { resultados?: CloudRow[] };
      const raw = data.resultados ?? [];
      const tests = raw.filter((r) => !isProgresoBanco(r.banco)).map(cloudToLocal);
      const progreso = raw.find((r) => isProgresoBanco(r.banco));
      const merged = await cache.mergeCloudResultados(tests);
      const checklistChanged = progreso ? this.applyProgreso(progreso) : false;
      await cache.recomputeStats(usuarioId);
      await cache.setMeta({
        lastPullAt: new Date().toISOString(),
        dirty: false,
      });

      await this.pushPending();

      if (merged.changed || checklistChanged || reason === "startup" || reason === "manual") {
        this.bumpRevision();
      }
      this.setPhase("synced", "Sincronizado");
    } catch {
      this.setPhase(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        "No se pudo sincronizar",
      );
    }
  }

  private applyProgreso(row: CloudRow): boolean {
    const raw = row.respuestas as { checklist?: Record<string, ChecklistMark> } | null;
    const checklist = raw?.checklist;
    if (!checklist || typeof checklist !== "object") return false;
    return mergeChecklistMarks(checklist);
  }

  private progresoPayload() {
    const now = new Date().toISOString();
    return {
      id: PROGRESO_RESULT_ID,
      usuario_id: JEX_ACCOUNT_ID,
      banco: PROGRESO_BANCO,
      test: "checklist",
      fecha: now,
      total_preguntas: 0,
      aciertos: 0,
      fallos: 0,
      tiempo_total: null,
      respuestas: { checklist: getChecklistMarks() },
      updated_at: now,
    };
  }

  private async pushPending(): Promise<void> {
    const cache = getLocalCache();
    const pending = (await cache.getPendingResultados()).filter((r) => !isProgresoBanco(r.banco));
    const payload = [...pending.map(localToCloudPayload), this.progresoPayload()];

    this.setPhase("syncing", "Sincronizando…");

    const res = await fetchWithRetry(
      "/api/resultados",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultados: payload }),
      },
      { retries: 2, baseDelayMs: 400, maxDelayMs: 6_000 },
    );

    if (!res.ok) {
      if (pending.length) {
        await cache.upsertResultados(
          pending.map((r) => ({ ...r, syncStatus: "error" as const })),
        );
      }
      throw new Error(`Push falló (${res.status})`);
    }

    if (pending.length) {
      await cache.markResultadosSynced(pending.map((r) => r.id));
    }
    await cache.setMeta({
      lastPushAt: new Date().toISOString(),
      dirty: false,
    });
  }

  /** Sube todo el historial IndexedDB a la nube, no solo los pendientes. */
  async pushAllLocal(): Promise<number> {
    if (this.running) await this.running;
    const cache = getLocalCache();
    const all = (await cache.getAllResultados()).filter((r) => !isProgresoBanco(r.banco));
    if (!all.length) return 0;

    const BATCH = 80;
    let upserted = 0;
    this.running = (async () => {
      try {
        for (let i = 0; i < all.length; i += BATCH) {
          const chunk = all.slice(i, i + BATCH);
          this.setPhase(
            "syncing",
            `Subiendo ${i + 1}–${Math.min(i + BATCH, all.length)} de ${all.length}…`,
          );
          const res = await fetchWithRetry(
            "/api/resultados",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resultados: chunk.map(localToCloudPayload),
              }),
            },
            { retries: 2, baseDelayMs: 400, maxDelayMs: 6_000 },
          );
          if (!res.ok) {
            await cache.upsertResultados(
              chunk.map((r) => ({ ...r, syncStatus: "error" as const })),
            );
            throw new Error(`Push falló (${res.status})`);
          }
          await cache.markResultadosSynced(chunk.map((r) => r.id));
          upserted += chunk.length;
        }
        await cache.setMeta({
          lastPushAt: new Date().toISOString(),
          dirty: false,
        });
        this.setPhase("synced", `Subidos ${upserted} resultados`);
      } catch (err) {
        this.setPhase(
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
          "No se pudo subir el historial",
        );
        throw err;
      }
    })().finally(() => {
      this.running = null;
    });
    await this.running;
    return upserted;
  }

  /** Mejor esfuerzo al cerrar pestaña (sendBeacon / fetch keepalive). */
  private flushPendingBeacon(): void {
    void (async () => {
      try {
        const pending = (await getLocalCache().getPendingResultados()).filter(
          (r) => !isProgresoBanco(r.banco),
        );
        if (!pending.length) return;
        const body = JSON.stringify({
          resultados: [...pending.map(localToCloudPayload), this.progresoPayload()],
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
