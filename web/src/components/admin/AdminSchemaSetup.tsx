"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSchemaSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al aplicar esquema");
    setMsg(data.message || "Esquema aplicado");
    router.refresh();
  }

  return (
    <div className="card card-warning">
      <h2>Falta la tabla de preguntas</h2>
      <p className="muted small">
        Supabase aún no tiene la tabla <code>preguntas</code>. Sin ella no se
        guardan ni muestran tests. Puedes aplicarla aquí o pegar{" "}
        <code>supabase/APLICAR-AHORA.sql</code> en el{" "}
        <a
          href="https://supabase.com/dashboard/project/pdesjumwekvgjhfldfge/sql/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          SQL Editor de Supabase
        </a>
        .
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
          {busy ? "Aplicando…" : "Crear tabla preguntas"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
