"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MateriaStatsRow } from "@/lib/queries/bancos";

type Props = {
  row: MateriaStatsRow;
  open: boolean;
  onClose: () => void;
  resumenOk: boolean;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

export function AdminMateriaResumenPanel({
  row,
  open,
  onClose,
  resumenOk,
  onMessage,
  onError,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      onError(null);
      try {
        const res = await fetch(`/api/admin/materias?id=${row.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar");
        if (!cancelled) setText(data.resumen_md ?? "");
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "Error al cargar ficha");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row.id, onError]);

  if (!open) return null;

  async function saveResumen() {
    setBusy("save");
    onError(null);
    onMessage(null);
    const res = await fetch(`/api/admin/materias?id=${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumen_md: text }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return onError(data.error || "Error al guardar");
    onMessage(`Ficha de «${row.nombre}» guardada`);
    router.refresh();
  }

  async function clearResumen() {
    if (!confirm(`¿Borrar la ficha de «${row.nombre}»?`)) return;
    setBusy("clear");
    onError(null);
    const res = await fetch(`/api/admin/materias?id=${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumen_md: null }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return onError(data.error || "Error al borrar");
    setText("");
    onMessage("Ficha eliminada");
    router.refresh();
  }

  async function importDocx(file: File, mode: "replace" | "append") {
    setBusy("import");
    onError(null);
    onMessage(null);
    const form = new FormData();
    form.set("materiaId", row.id);
    form.set("file", file);
    form.set("mode", mode);
    const res = await fetch("/api/admin/materias/import-docx", { method: "POST", body: form });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return onError(data.error || "Error al importar Word");
    setText(data.resumen_md ?? "");
    onMessage(
      data.appended
        ? `Word añadido a «${row.nombre}» (${data.chars?.toLocaleString("es-ES")} caracteres)`
        : `Word importado en «${row.nombre}» (${data.chars?.toLocaleString("es-ES")} caracteres)`,
    );
    router.refresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const hasExisting = row.hasResumen || text.trim().length > 0;
    const mode =
      hasExisting &&
      confirm(
        "¿Añadir al final del resumen existente?\n\nAceptar = añadir\nCancelar = reemplazar todo",
      )
        ? "append"
        : "replace";
    void importDocx(file, mode);
  }

  return (
    <div className="admin-resumen-panel card">
      <div className="admin-resumen-panel-head">
        <h3>Ficha — {row.nombre}</h3>
        <button type="button" className="btn-link btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="muted small">
        Pega Markdown o importa un <strong>.docx</strong> (se convierte a Markdown con tablas).
        {row.hasResumen && resumenOk && (
          <>
            {" "}
            <Link href={`/materia/${row.id}`} target="_blank" rel="noopener noreferrer">
              Ver en Tests →
            </Link>
          </>
        )}
      </p>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <textarea
          className="admin-resumen-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Contenido de la ficha…"
          disabled={busy !== null}
        />
      )}
      <div className="form-actions admin-resumen-actions">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy !== null || loading || !resumenOk}
          onClick={() => void saveResumen()}
        >
          {busy === "save" ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy !== null || !resumenOk}
          onClick={() => fileRef.current?.click()}
        >
          {busy === "import" ? "Importando…" : "Importar Word"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={onFileChange}
        />
        {row.hasResumen && (
          <button
            type="button"
            className="btn-danger btn-sm"
            disabled={busy !== null}
            onClick={() => void clearResumen()}
          >
            {busy === "clear" ? "…" : "Borrar ficha"}
          </button>
        )}
      </div>
    </div>
  );
}
