"use client";

import { useState, type ReactNode } from "react";
import { usePersistence } from "@/components/PersistenceProvider";

/** Indicador compacto de estado de sincronización (local ↔ nube). */
export function SyncStatusIndicator({
  localSaved = false,
  showSyncButton = false,
}: {
  /** Tras terminar un test: “guardado local” inmediato. */
  localSaved?: boolean;
  /** Botón manual para forzar sync antes de cerrar el navegador. */
  showSyncButton?: boolean;
}) {
  const { phase, detail, syncNow } = usePersistence();
  const [busy, setBusy] = useState(false);

  async function handleSync() {
    if (busy || phase === "syncing") return;
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  }

  const syncing = busy || phase === "syncing";

  let status: ReactNode = null;

  if (syncing) {
    status = (
      <p className="sync-status sync-status--syncing" role="status">
        <span className="sync-status-dot" aria-hidden />
        Sincronizando…
      </p>
    );
  } else if (phase === "synced") {
    status = (
      <p className="sync-status sync-status--ok" role="status">
        <span className="sync-status-icon" aria-hidden>
          ✓
        </span>
        Sincronizado
        {localSaved ? " · guardado en la nube" : ""}
      </p>
    );
  } else if (phase === "offline" || phase === "error") {
    status = (
      <p className="sync-status sync-status--warn" role="status">
        {detail || (phase === "offline" ? "Modo local" : "Error de sync")}
      </p>
    );
  } else if (localSaved) {
    status = (
      <p className="sync-status sync-status--local" role="status">
        Datos guardados localmente
      </p>
    );
  }

  if (!status && !showSyncButton) return null;

  return (
    <div className="sync-status-row">
      {status}
      {showSyncButton && (
        <button
          type="button"
          className="btn-secondary btn-sm sync-status-btn"
          disabled={syncing}
          onClick={() => void handleSync()}
        >
          {syncing ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      )}
    </div>
  );
}
