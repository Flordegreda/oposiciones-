"use client";

import { useEffect, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import { getOrCreateUsuarioId } from "@/lib/persistence/local-cache-service";

export function DeviceSyncPanel() {
  const { phase, detail, syncNow, adoptUsuarioId } = usePersistence();
  const [codigo, setCodigo] = useState("");
  const [otro, setOtro] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCodigo(getOrCreateUsuarioId());
  }, []);

  const syncing = busy || phase === "syncing";

  async function handleSync() {
    if (syncing) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await syncNow();
      setMessage("Datos actualizados en este dispositivo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el código a mano.");
    }
  }

  async function handleAdopt(e: React.FormEvent) {
    e.preventDefault();
    if (syncing) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adoptUsuarioId(otro);
      setCodigo(getOrCreateUsuarioId());
      setOtro("");
      setMessage("Dispositivos vinculados. Ya compartís el mismo historial.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="device-sync" aria-label="Sincronizar entre dispositivos">
      <div className="device-sync-head">
        <h2 className="device-sync-title">Sincronizar dispositivos</h2>
        <p className="device-sync-lead">
          Usa el mismo código en el móvil y en el ordenador para compartir tests, notas y
          progreso.
        </p>
      </div>

      <label className="device-sync-label" htmlFor="device-sync-code">
        Código de este dispositivo
      </label>
      <div className="device-sync-code-row">
        <input
          id="device-sync-code"
          className="device-sync-code"
          value={codigo}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleCopy()}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <button
        type="button"
        className="btn-primary device-sync-main-btn"
        disabled={syncing || !codigo}
        onClick={() => void handleSync()}
      >
        {syncing ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      <p className="device-sync-status" role="status">
        {phase === "synced"
          ? "Sincronizado"
          : phase === "offline"
            ? detail || "Sin conexión · solo local"
            : phase === "error"
              ? detail || "Error de sync"
              : detail || "Pulsa para subir y bajar tus datos"}
      </p>

      <form className="device-sync-adopt" onSubmit={(e) => void handleAdopt(e)}>
        <label className="device-sync-label" htmlFor="device-sync-other">
          Código de otro dispositivo
        </label>
        <div className="device-sync-code-row">
          <input
            id="device-sync-other"
            className="device-sync-code"
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            placeholder="Pega aquí el código"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn-secondary btn-sm" disabled={syncing || !otro.trim()}>
            Vincular
          </button>
        </div>
      </form>

      {message && <p className="device-sync-ok">{message}</p>}
      {error && <p className="device-sync-err">{error}</p>}
    </section>
  );
}
