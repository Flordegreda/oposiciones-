"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminFalladasSetup() {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-falladas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al aplicar");
    setMsg(data.message || "Cola de falladas activada");
    router.refresh();
  }

  return (
    <div className="card card-warning">
      <h2>Cola de falladas</h2>
      <p className="muted small">
        Activa la tabla <code>cola_repaso</code> para guardar incorrectas y dudosas al terminar
        un test (por dispositivo, sin login). Luego puedes repasarla en{" "}
        <strong>Repaso</strong>.
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
          {busy ? "Aplicando…" : "Activar cola de falladas"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
