"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  label?: string;
  busyLabel?: string;
  compact?: boolean;
};

export function AdminFichasApply({
  label = "Activar fichas",
  busyLabel = "Aplicando…",
  compact = false,
}: Props) {
  const router = useRouter();
  const [dbPassword, setDbPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function aplicar() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/apply-fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbPassword: dbPassword || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al aplicar");
    setMsg(data.message || "Esquema de fichas actualizado");
    router.refresh();
  }

  return (
    <div>
      {!compact && (
        <label>
          Contraseña BD (opcional si está en <code>SUPABASE_DB_PASSWORD</code>)
          <input
            type="password"
            value={dbPassword}
            onChange={(e) => setDbPassword(e.target.value)}
            placeholder="Contraseña de postgres"
            autoComplete="off"
            disabled={busy}
          />
        </label>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy}
          onClick={() => void aplicar()}
        >
          {busy ? busyLabel : label}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
