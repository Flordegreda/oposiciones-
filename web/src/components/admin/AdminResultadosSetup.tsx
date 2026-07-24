"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminResultadosSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al aplicar");
    setMsg(data.message || "Resultados activados");
    router.refresh();
  }

  return (
    <div className="card card-warning">
      <h2>Resultados de tests (nube)</h2>
      <p className="muted small">
        Activa <code>resultados_tests</code> y las vistas de estadísticas para sincronizar
        resultados entre dispositivos. Mientras tanto, los tests se guardan en IndexedDB
        del navegador.
      </p>
      <label>
        Contraseña BD (opcional si está en <code>SUPABASE_DB_PASSWORD</code>)
        <input
          type="password"
          value={dbPassword}
          onChange={(e) => setDbPassword(e.target.value)}
          placeholder="Contraseña de postgres"
          autoComplete="off"
        />
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy}
          onClick={() => void aplicar()}
        >
          {busy ? "Aplicando…" : "Activar resultados"}
        </button>
      </div>
      {msg && <p className="ok small">{msg}</p>}
      {err && <p className="error small">{err}</p>}
    </div>
  );
}
