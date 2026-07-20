"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminMateriasFichasSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-materia-fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al activar fichas por tema");
    setMsg(data.message || "Fichas por tema activadas");
    router.refresh();
  }

  return (
    <div className="card card-warning">
      <h2>Fichas por tema</h2>
      <p className="muted small">
        Activa la tabla <code>materia_fichas</code> para importar un Word por tema (p. ej.{" "}
        <code>Tema_37_LEF_ficha.docx</code>) y repasar con secciones plegables y modo trampas.
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
          {busy ? "Activando…" : "Activar fichas por tema"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
