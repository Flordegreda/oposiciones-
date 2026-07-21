"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPdfSize } from "@/lib/format-pdf-size";
import { tituloFromFilename } from "@/lib/resumenes-client";

type Materia = { id: string; nombre: string };

type ResumenRow = {
  id: string;
  materiaId: string;
  materiaNombre: string;
  titulo: string;
  filename: string;
  sizeBytes: number;
};

type Section = {
  materiaId: string;
  materiaNombre: string;
  items: ResumenRow[];
};

type Props = {
  materias: Materia[];
  sections: Section[];
  resumenesOk: boolean;
  schemaOk: boolean;
};

export function AdminResumenes({ materias, sections, resumenesOk, schemaOk }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  async function upload(file: File) {
    if (!materiaId) return setErr("Selecciona una materia");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErr("Solo archivos PDF");

    setBusy("upload");
    setErr(null);
    setMsg(null);

    try {
      const titulo = tituloFromFilename(file.name);
      const prep = await fetch("/api/admin/resumenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          filename: file.name,
          size: file.size,
          titulo,
        }),
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
      if (!uploadRes.ok) throw new Error("Error al subir el PDF");

      const confirm = await fetch(`/api/admin/resumenes/${prepData.resumenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          path: prepData.path,
          filename: file.name,
          titulo: prepData.titulo ?? titulo,
          size: file.size,
        }),
      });
      const confirmData = await confirm.json();
      if (!confirm.ok) throw new Error(confirmData.error || "Error al guardar");

      setMsg(`PDF «${titulo}» subido`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function eliminar(item: ResumenRow) {
    if (!confirm(`¿Eliminar «${item.titulo}»?\n\nEsta acción no se puede deshacer.`)) return;

    setBusy(item.id);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/resumenes/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setMsg(`Eliminado: «${item.titulo}»`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(null);
    }
  }

  if (!resumenesOk) {
    return (
      <div className="card card-elevated">
        <h2>Resúmenes PDF</h2>
        <p className="muted small">
          Activa la función con la tarjeta amarilla <strong>Resúmenes PDF</strong> arriba en
          esta página (solo la primera vez).
        </p>
      </div>
    );
  }

  return (
    <>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="card card-elevated">
        <h2>Subir resumen PDF</h2>
        <p className="muted small">
          Puedes tener <strong>varios PDF por materia</strong>. Se verán en la sección{" "}
          <Link href="/resumenes">Resúmenes</Link> (tablet/PC).
        </p>
        <div className="form-grid-fields carga-campos" style={{ marginTop: "0.75rem" }}>
          <label>
            Materia
            <select
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              disabled={!schemaOk || busy !== null || materias.length === 0}
            >
              {materias.length === 0 && <option value="">Sin materias</option>}
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="file-upload">
            Archivo PDF
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              disabled={!schemaOk || busy !== null || !materiaId}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <span className="btn-primary btn-sm">{busy === "upload" ? "Subiendo…" : "Elegir PDF"}</span>
          </label>
        </div>
      </div>

      <div className="card card-elevated">
        <h2>Biblioteca ({total})</h2>
        {total === 0 ? (
          <p className="muted">No hay PDFs todavía.</p>
        ) : (
          sections.map((section) => (
            <section key={section.materiaId} className="admin-resumenes-section">
              <h3 className="admin-resumenes-materia">{section.materiaNombre}</h3>
              <ul className="admin-resumenes-list">
                {section.items.map((item) => (
                  <li key={item.id} className="admin-resumenes-row">
                    <div className="admin-resumenes-row-main">
                      <strong>{item.titulo}</strong>
                      <span className="muted small">
                        {item.filename} · {formatPdfSize(item.sizeBytes)}
                      </span>
                    </div>
                    <div className="admin-resumenes-row-actions">
                      <Link href={`/resumen/${item.id}`} className="btn-link btn-sm">
                        Ver
                      </Link>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        disabled={busy !== null}
                        onClick={() => void eliminar(item)}
                      >
                        {busy === item.id ? "…" : "Eliminar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
