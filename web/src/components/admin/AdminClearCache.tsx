"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchWithRetry } from "@/lib/retry";

export function AdminClearCache() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function limpiar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetchWithRetry("/api/admin/clear-cache", { method: "POST" }, {
        retries: 2,
        baseDelayMs: 300,
        maxDelayMs: 4_000,
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Error al limpiar caché");
      setMsg(data.message || "Caché limpiada");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al limpiar caché");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-cache-clear card">
      <div className="admin-cache-clear-body">
        <p className="admin-cache-clear-title">¿Va lento o ves datos viejos?</p>
        <p className="muted small admin-cache-clear-hint">
          Borra la caché del servidor (listados de tests ~10 min, material y
          comprobaciones de tablas). No borra tus preguntas ni bancos.
        </p>
      </div>
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={busy}
        onClick={() => void limpiar()}
      >
        {busy ? "Limpiando…" : "Limpiar caché"}
      </button>
      {msg && <p className="ok small admin-cache-clear-msg">{msg}</p>}
      {err && <p className="error small admin-cache-clear-msg">{err}</p>}
    </div>
  );
}
