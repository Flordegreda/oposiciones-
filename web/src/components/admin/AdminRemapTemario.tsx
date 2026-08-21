"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchErrorMessage, fetchJsonWithRetry } from "@/lib/fetch-json";

type PorCarpeta = {
  orden: number;
  nombre: string;
  bancos: number;
  mazos: number;
};

type RemapResponse = {
  error?: string;
  message?: string;
  dryRun?: boolean;
  materias?: number;
  bancos?: number;
  mazos?: number;
  create?: number;
  merge?: number;
  delete?: number;
  bancosAMover?: number;
  mazosAMover?: number;
  plan?: {
    porCarpeta?: PorCarpeta[];
    create?: Array<{ nombre: string }>;
    delete?: Array<{ nombre: string }>;
    merge?: Array<{ fromNombre: string; intoNombre: string }>;
  };
};

export function AdminRemapTemario() {
  const router = useRouter();
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [preview, setPreview] = useState<RemapResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function cargarPreview() {
    setBusy("preview");
    setErr(null);
    setMsg(null);
    try {
      const { res, data, text } = await fetchJsonWithRetry<RemapResponse>(
        "/api/admin/remap-temario",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true }),
        },
      );
      if (!res.ok) {
        throw new Error(fetchErrorMessage(res, data, text, "Error al previsualizar"));
      }
      if (!data) throw new Error("Respuesta vacía del servidor");
      setPreview(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setPreview(null);
    } finally {
      setBusy(null);
    }
  }

  async function aplicar() {
    if (
      !preview ||
      !confirm(
        "¿Reorganizar el temario en las 19 carpetas de la imagen?\n\n" +
          "Los tests y fichas se mueven a la carpeta que les toca. " +
          "Lo que no encaje va a 33 OTROS. Haz copia de seguridad antes.",
      )
    ) {
      return;
    }

    setBusy("apply");
    setErr(null);
    setMsg(null);
    try {
      const { res, data, text } = await fetchJsonWithRetry<RemapResponse>(
        "/api/admin/remap-temario",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: false }),
        },
      );
      if (!res.ok) {
        throw new Error(fetchErrorMessage(res, data, text, "Error al aplicar"));
      }
      setMsg(data?.message || "Temario reorganizado");
      setPreview(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  const carpetas = preview?.plan?.porCarpeta ?? [];

  return (
    <div className="card card-elevated">
      <h2>Temario en 19 carpetas</h2>
      <p className="muted small">
        Alinea materias, tests y fichas con el orden oficial (01 ABOGACIA, 03 ADMINISTRACION
        LOCAL, … 33 OTROS). Primero previsualiza; luego aplica.
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy !== null}
          onClick={() => void cargarPreview()}
        >
          {busy === "preview" ? "Calculando…" : "Previsualizar"}
        </button>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy !== null || !preview}
          onClick={() => void aplicar()}
        >
          {busy === "apply" ? "Aplicando…" : "Aplicar reorganización"}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
      {preview && (
        <div className="muted small" style={{ marginTop: "0.75rem" }}>
          <p>
            {preview.materias ?? 0} materias actuales · {preview.bancos ?? 0} bancos ·{" "}
            {preview.mazos ?? 0} mazos
          </p>
          <p>
            Crear {preview.create ?? 0} · fusionar {preview.merge ?? 0} · eliminar sobrantes{" "}
            {preview.delete ?? 0} · mover {preview.bancosAMover ?? 0} tests y{" "}
            {preview.mazosAMover ?? 0} mazos
          </p>
          {preview.plan?.create && preview.plan.create.length > 0 && (
            <p>Nuevas: {preview.plan.create.map((c) => c.nombre).join(", ")}</p>
          )}
          {preview.plan?.merge && preview.plan.merge.length > 0 && (
            <p>
              Fusionar:{" "}
              {preview.plan.merge
                .map((m) => `${m.fromNombre} → ${m.intoNombre}`)
                .join(" · ")}
            </p>
          )}
          {carpetas.length > 0 && (
            <ul className="print-bundle-preview">
              {carpetas.map((c) => (
                <li key={c.orden}>
                  {c.nombre} ({c.bancos} tests · {c.mazos} fichas)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
