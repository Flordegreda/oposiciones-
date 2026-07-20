"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminMateriasResumenSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-materias-resumen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al activar fichas");
    setMsg(data.message || "Fichas activadas");
    router.refresh();
  }

  return (
    <div className="card card-warning">
      <h2>Activar fichas / resúmenes</h2>
      <p className="muted small">
        Para importar Word y ver apuntes en Tests, la tabla <code>materias</code> necesita la
        columna <code>resumen_md</code>. Actívala aquí o ejecuta{" "}
        <code>supabase/MATERIAS-RESUMEN.sql</code> en el SQL Editor de Supabase.
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
          {busy ? "Activando…" : "Activar fichas"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
