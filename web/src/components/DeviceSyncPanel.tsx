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
            ? detail || "No se ha podido subir el avance. En otro dispositivo no lo verás."
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
    </section>
  );
}
