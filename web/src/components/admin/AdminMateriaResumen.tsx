"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPdfSize } from "@/lib/format-pdf-size";

type ResumenMeta = {
  filename: string;
  sizeBytes: number;
};

type Props = {
  materiaId: string;
  resumen: ResumenMeta | null | undefined;
  resumenesOk: boolean;
  disabled?: boolean;
};

export function AdminMateriaResumen({
  materiaId,
  resumen,
  resumenesOk,
  disabled = false,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErr("Solo archivos PDF");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const prep = await fetch(`/api/admin/materias/${materiaId}/resumen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const prepData = await prep.json();
      if (!prep.ok) throw new Error(prepData.error || "Error al preparar la subida");

      const uploadRes = await fetch(prepData.signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": "application/pdf",
          "x-upsert": "true",
        },
      });
      if (!uploadRes.ok) throw new Error("Error al subir el PDF a almacenamiento");

      const confirm = await fetch(`/api/admin/materias/${materiaId}/resumen`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: prepData.path,
          filename: file.name,
          size: file.size,
        }),
      });
      const confirmData = await confirm.json();
      if (!confirm.ok) throw new Error(confirmData.error || "Error al guardar el resumen");

      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function eliminar() {
    if (!confirm("¿Eliminar el PDF de resumen de esta materia?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/materias/${materiaId}/resumen`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  if (!resumenesOk) {
    return (
      <span className="muted small admin-resumen-pending" title="Activa resúmenes PDF arriba">
        Resumen
      </span>
    );
  }

  return (
    <span className="admin-resumen-actions">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {resumen ? (
        <>
          <Link
            href={`/resumen/${materiaId}`}
            className="btn-link btn-sm admin-resumen-link"
            title={`${resumen.filename} (${formatPdfSize(resumen.sizeBytes)})`}
          >
            Resumen
          </Link>
          <button
            type="button"
            className="btn-link btn-sm"
            disabled={disabled || busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "…" : "Cambiar"}
          </button>
          <button
            type="button"
            className="btn-link btn-sm"
            disabled={disabled || busy}
            onClick={() => void eliminar()}
          >
            Quitar PDF
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn-link btn-sm"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Subiendo…" : "Subir PDF"}
        </button>
      )}
      {err && (
        <span className="error small admin-resumen-error" title={err}>
          !
        </span>
      )}
    </span>
  );
}
