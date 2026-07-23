"use client";

import Link from "next/link";
import { useState } from "react";

type GapItem = {
  id: string;
  nombre: string;
  materiaNombre: string;
  numPreguntas: number;
  reason: string;
  hint: string;
};

export function AdminAuditImport() {
  const [items, setItems] = useState<GapItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function escanear() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/bancos/audit-import");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al escanear");
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-warning" style={{ marginBottom: "1rem" }}>
      <h2 className="admin-section-title" style={{ marginTop: 0 }}>
        Bancos posiblemente incompletos
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Detecta bancos que pueden haber perdido preguntas al importar (p. ej. 47–49 cuando
        lo normal en la materia son 50). Hay que{" "}
        <strong>volver a pegar el texto</strong> en Importar y eliminar el banco viejo.
      </p>
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={busy}
        onClick={() => void escanear()}
      >
        {busy ? "Escaneando…" : items ? "Volver a escanear" : "Escanear bancos"}
      </button>
      {err && (
        <p className="error small" style={{ marginTop: "0.5rem" }}>
          {err}
        </p>
      )}
      {items && (
        <>
          {items.length === 0 ? (
            <p className="ok small" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              No se detectan bancos sospechosos con la heurística actual.
            </p>
          ) : (
            <>
              <p className="error small" style={{ marginTop: "0.75rem" }}>
                <strong>{items.length}</strong> banco{items.length !== 1 ? "s" : ""} a revisar
              </p>
              <ul className="admin-banco-list" style={{ marginTop: "0.5rem" }}>
                {items.map((b) => (
                  <li key={b.id}>
                    <div className="admin-banco-info">
                      <span className="materia-tag">{b.materiaNombre}</span>
                      <strong>{b.nombre}</strong>
                      <span className="muted small">{b.numPreguntas} preg.</span>
                    </div>
                    <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
                      {b.hint}
                    </p>
                    <div className="admin-banco-actions" style={{ marginTop: "0.5rem" }}>
                      <Link href={`/admin/bancos/${b.id}`} className="btn-primary btn-sm">
                        Editar / eliminar
                      </Link>
                      <Link href="/admin?tab=importar" className="btn-secondary btn-sm">
                        Reimportar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
