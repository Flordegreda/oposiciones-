"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MateriaRenamePlanItem } from "@/lib/materia-rename-map";

type Preview = {
  mapa: number;
  resumen: {
    total: number;
    renombrar: number;
    iguales: number;
    noEncontradas: number;
    conflictos: number;
    sinMapa: number;
  };
  plan: MateriaRenamePlanItem[];
};

function estadoLabel(estado: MateriaRenamePlanItem["estado"]): string {
  switch (estado) {
    case "ok":
      return "Renombrar";
    case "igual":
      return "Ya correcto";
    case "conflicto":
      return "Conflicto";
    default:
      return "Aviso";
  }
}

export function AdminMateriaRenameMap() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function cargarPreview() {
    setBusy("preview");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/materias/rename-map");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al previsualizar");
      setPreview(data as Preview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function aplicar() {
    if (!preview?.resumen.renombrar) {
      setErr("No hay materias que renombrar.");
      return;
    }
    if (
      !confirm(
        `¿Renombrar ${preview.resumen.renombrar} materia${preview.resumen.renombrar !== 1 ? "s" : ""} según el mapa WEB → NOMBRE NUEVO?\n\nHaz copia de seguridad antes.`,
      )
    ) {
      return;
    }

    setBusy("apply");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/materias/rename-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aplicar");
      setMsg(`Renombradas ${data.applied} materia${data.applied !== 1 ? "s" : ""}.`);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card card-elevated admin-rename-map">
      <h2 className="admin-section-title" style={{ marginTop: 0 }}>
        Renombrar materias (WEB → nombre nuevo)
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Aplica el mapa acordado: cambia el nombre de cada materia en la web (teórico, práctico,
        fichas y listados). No mueve preguntas ni borra bancos.{" "}
        <strong>Haz copia de seguridad antes.</strong>
      </p>

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={!!busy}
          onClick={() => void cargarPreview()}
        >
          {busy === "preview" ? "Calculando…" : "Previsualizar renombres"}
        </button>
        {preview && preview.resumen.renombrar > 0 && preview.resumen.conflictos === 0 && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!!busy}
            onClick={() => void aplicar()}
          >
            {busy === "apply" ? "Aplicando…" : `Aplicar ${preview.resumen.renombrar} cambios`}
          </button>
        )}
      </div>

      {preview && (
        <div className="admin-rename-map-preview muted small">
          <p style={{ margin: "0.75rem 0 0.5rem" }}>
            Mapa: {preview.mapa} filas · Renombrar: <strong>{preview.resumen.renombrar}</strong> ·
            Ya correctas: {preview.resumen.iguales} · Sin match: {preview.resumen.noEncontradas} ·
            Sin mapa: {preview.resumen.sinMapa}
            {preview.resumen.conflictos > 0 && (
              <>
                {" "}
                · <span className="error">Conflictos: {preview.resumen.conflictos}</span>
              </>
            )}
          </p>
          <div className="admin-rename-map-scroll">
            <table className="admin-rename-map-table">
              <thead>
                <tr>
                  <th>WEB</th>
                  <th>Actual en BD</th>
                  <th>Nombre nuevo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.plan.map((row, i) => (
                  <tr key={`${row.id || row.web}-${i}`} className={`admin-rename-row--${row.estado}`}>
                    <td>{row.web}</td>
                    <td>{row.actual}</td>
                    <td>{row.nuevo}</td>
                    <td>
                      {estadoLabel(row.estado)}
                      {row.detalle ? (
                        <span className="admin-rename-detalle" title={row.detalle}>
                          {" "}
                          · {row.detalle}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
