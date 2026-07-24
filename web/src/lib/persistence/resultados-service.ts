/**
 * Guardado híbrido local → resultados_tests (sin sincronización entre dispositivos).
 */

import {
  embedDetalleInRespuestas,
  extractDetalleFromRespuestas,
} from "@/lib/persistence/estadisticas-service";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import { fetchWithRetry } from "@/lib/retry";

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

async function pushPending(): Promise<void> {
  const cache = getLocalCache();
  const pending = await cache.getPendingResultados();
  if (!pending.length) return;

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

function flushPendingBeacon(): void {
  void (async () => {
    try {
      const pending = await getLocalCache().getPendingResultados();
      if (!pending.length) return;
      const body = JSON.stringify({
        resultados: pending.map(localToCloudPayload),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/resultados", new Blob([body], { type: "application/json" }));
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

let unloadHooked = false;

function ensureUnloadHook(): void {
  if (typeof window === "undefined" || unloadHooked) return;
  unloadHooked = true;
  window.addEventListener("beforeunload", flushPendingBeacon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingBeacon();
  });
}

/** Guarda en IndexedDB al instante y envía a resultados_tests en segundo plano. */
export async function saveResultadoTest(
  input: Omit<TestResultRecord, "usuarioId" | "syncStatus" | "updatedAt"> & {
    usuarioId?: string;
    updatedAt?: string;
  },
): Promise<TestResultRecord> {
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
  ensureUnloadHook();

  void pushPending().catch(() => {
    /* queda en local; reintento en próximo test o al cerrar pestaña */
  });

  return record;
}

/** Utilidad para importar respuestas embebidas desde la nube (solo admin/export). */
export { extractDetalleFromRespuestas };
