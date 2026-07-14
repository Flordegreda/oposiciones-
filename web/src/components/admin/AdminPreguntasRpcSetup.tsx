"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPreguntasRpcSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-preguntas-rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al aplicar");
    setMsg(data.message || "Optimización aplicada");
    router.refresh();
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Acelerar Material</h2>
      <p className="muted small">
        Instala en Supabase una función que cuenta preguntas por banco en{" "}
        <strong>una sola consulta</strong>. Sin esto la app funciona, pero la primera
        carga de Material es más lenta. Solo hay que hacerlo una vez.
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
          {busy ? "Aplicando…" : "Aplicar optimización"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
