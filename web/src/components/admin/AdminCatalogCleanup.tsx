"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Resumen = {
  materias: number;
  mazosRenombrados: number;
  mazosMovidos: number;
  mazosEliminados: number;
  mazosFusionados: number;
  bancosRenombrados: number;
  bancosFusionados: number;
  bancosEliminados: number;
};

export function AdminCatalogCleanup() {
  const router = useRouter();
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function preview() {
    setBusy("preview");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/catalog/cleanup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo analizar");
      setResumen(data.resumen);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (
      !confirm(
        "¿Limpiar el catálogo?\n\nCorrige erratas, quita mazos mal ubicados y fusiona duplicados. Haz copia de seguridad antes.",
      )
    ) {
      return;
    }
    setBusy("apply");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/catalog/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo aplicar");
      const r = data.resumen as Resumen;
      setResumen(r);
      setMsg(
        data.ok
          ? "Catálogo limpio."
          : `Aplicado con avisos: ${(data.errors ?? []).join(" · ")}`,
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card card-elevated">
      <h2 className="card-title">Limpiar catálogo</h2>
      <p className="muted small">
        Erratas de nombre, mazos en la materia equivocada, vacíos y duplicados. El resumen de
        cobertura solo es fiable después de esto.
      </p>
      {err && <p className="error">{err}</p>}
      {msg && <p className="ok">{msg}</p>}
      {resumen && (
        <p className="muted small">
          Materias {resumen.materias} · mazos {resumen.mazosRenombrados} renombrados /{" "}
          {resumen.mazosMovidos} movidos / {resumen.mazosEliminados} borrados /{" "}
          {resumen.mazosFusionados} fusionados · bancos {resumen.bancosRenombrados}{" "}
          renombrados / {resumen.bancosFusionados} fusionados / {resumen.bancosEliminados}{" "}
          borrados
        </p>
      )}
      <div className="admin-actions">
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => void preview()}>
          {busy === "preview" ? "Analizando…" : "Vista previa"}
        </button>
        <button type="button" className="btn-primary" disabled={!!busy} onClick={() => void apply()}>
          {busy === "apply" ? "Aplicando…" : "Limpiar ahora"}
        </button>
      </div>
    </div>
  );
}
