"use client";

import { usePersistence } from "@/components/PersistenceProvider";

/** Indicador compacto de estado de sincronización (local ↔ nube). */
export function SyncStatusIndicator({
  localSaved = false,
}: {
  /** Tras terminar un test: “guardado local” inmediato. */
  localSaved?: boolean;
}) {
  const { phase, detail } = usePersistence();

  if (localSaved && phase !== "syncing" && phase !== "synced") {
    return (
      <p className="sync-status sync-status--local" role="status">
        Datos guardados localmente
      </p>
    );
  }

  if (phase === "syncing") {
    return (
      <p className="sync-status sync-status--syncing" role="status">
        <span className="sync-status-dot" aria-hidden />
        Sincronizando…
      </p>
    );
  }

  if (phase === "synced") {
    return (
      <p className="sync-status sync-status--ok" role="status">
        <span className="sync-status-icon" aria-hidden>
          ✓
        </span>
        Sincronizado
        {localSaved ? " · guardado en la nube" : ""}
      </p>
    );
  }

  if (phase === "offline" || phase === "error") {
    return (
      <p className="sync-status sync-status--warn" role="status">
        {detail || (phase === "offline" ? "Modo local" : "Error de sync")}
      </p>
    );
  }

  if (localSaved) {
    return (
      <p className="sync-status sync-status--local" role="status">
        Datos guardados localmente
      </p>
    );
  }

  return null;
}
