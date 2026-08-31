"use client";

import { usePersistence } from "@/components/PersistenceProvider";

export function DeviceSyncPanel() {
  const { phase, detail } = usePersistence();

  const status =
    phase === "syncing"
      ? "Sincronizando…"
      : phase === "synced"
        ? "Al día en todos tus dispositivos"
        : phase === "offline"
          ? detail || "Sin conexión · se guardará al volver"
          : phase === "error"
            ? detail || "No se pudo sincronizar. Reintentará solo."
            : "Sincronizando en segundo plano";

  return (
    <section className="device-sync device-sync--auto" aria-label="Sincronización">
      <p className="device-sync-status-line" role="status">
        <span
          className={`device-sync-dot${phase === "syncing" ? " device-sync-dot--pulse" : ""}${
            phase === "synced" ? " device-sync-dot--ok" : ""
          }${phase === "error" || phase === "offline" ? " device-sync-dot--warn" : ""}`}
          aria-hidden
        />
        {status}
      </p>
      <p className="device-sync-lead">
        Los tests y las fichas marcadas se copian solos entre el móvil y el ordenador. No hace
        falta ningún código.
      </p>
    </section>
  );
}
