"use client";

import { useState } from "react";

export function AdminProgresoReset() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reiniciar() {
    const ok = confirm(
      "¿Reiniciar estadísticas a cero?\n\n" +
        "Se borrarán todos los resultados guardados (tests y simulacros).\n" +
        "Las estadísticas volverán a contar desde ahora.\n\n" +
        "Los favoritos y el repaso de fallos no se modifican.",
    );
    if (!ok) return;

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/progreso/reset-stats", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo reiniciar");
      setMsg(
        data.deleted > 0
          ? `Estadísticas reiniciadas. Eliminados ${data.deleted} resultado(s).`
          : "Estadísticas reiniciadas (no había datos previos).",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card admin-section-card">
      <h2 className="admin-section-title">Estadísticas de uso</h2>
      <p className="muted small">
        Borra todos los resultados guardados y reinicia los contadores. Úsalo si quieres empezar
        de cero (por ejemplo, al iniciar una nueva fase de estudio).
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy}
          onClick={() => void reiniciar()}
        >
          {busy ? "Reiniciando…" : "Reiniciar estadísticas"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
