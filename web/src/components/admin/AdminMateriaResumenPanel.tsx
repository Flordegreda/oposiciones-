"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MateriaStatsRow } from "@/lib/queries/bancos";
import type { MateriaFichaRow } from "@/lib/queries/fichas";

type Props = {
  row: MateriaStatsRow;
  open: boolean;
  onClose: () => void;
  resumenOk: boolean;
  fichasOk: boolean;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

export function AdminMateriaResumenPanel({
  row,
  open,
  onClose,
  resumenOk,
  fichasOk,
  onMessage,
  onError,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [fichas, setFichas] = useState<MateriaFichaRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      onError(null);
      try {
        if (fichasOk) {
          const res = await fetch(`/api/admin/materias/fichas?materiaId=${row.id}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error al cargar");
          if (!cancelled) setFichas(data.fichas ?? []);
        }
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "Error al cargar fichas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row.id, fichasOk, onError]);

  if (!open) return null;

  async function importDocx(file: File) {
    setBusy("import");
    onError(null);
    onMessage(null);
    const form = new FormData();
    form.set("materiaId", row.id);
    form.set("file", file);
    form.set("mode", "replace");
    const res = await fetch("/api/admin/materias/import-docx", { method: "POST", body: form });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return onError(data.error || "Error al importar Word");
    if (data.perTema && data.tema_numero) {
      onMessage(
        `Tema ${data.tema_numero} importado en «${row.nombre}» (${data.chars?.toLocaleString("es-ES")} caracteres)`,
      );
      setFichas((prev) => {
        const next = prev.filter((f) => f.tema_numero !== data.tema_numero);
        return [...next, data].sort((a, b) => a.tema_numero - b.tema_numero);
      });
    } else {
      onMessage(`Word importado en «${row.nombre}» (modo legacy)`);
    }
    router.refresh();
  }

  async function deleteFicha(id: string, tema: number) {
    if (!confirm(`¿Borrar la ficha del tema ${tema}?`)) return;
    setBusy(id);
    const res = await fetch(`/api/admin/materias/fichas?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return onError(data.error || "Error al borrar");
    setFichas((prev) => prev.filter((f) => f.id !== id));
    onMessage(`Ficha tema ${tema} eliminada`);
    router.refresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void importDocx(file);
  }

  const canImport = fichasOk || resumenOk;

  return (
    <div className="admin-resumen-panel card">
      <div className="admin-resumen-panel-head">
        <h3>Fichas — {row.nombre}</h3>
        <button type="button" className="btn-link btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="muted small">
        Importa <strong>.docx</strong> con nombre tipo <code>Tema_37_LEF_ficha.docx</code>. Cada
        tema queda aparte; en Tests se repasa con secciones y trampas.
        {row.hasResumen && (
          <>
            {" "}
            <Link href={`/materia/${row.id}`} target="_blank" rel="noopener noreferrer">
              Ver índice →
            </Link>
          </>
        )}
      </p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : fichas.length > 0 ? (
        <ul className="admin-ficha-list">
          {fichas.map((f) => (
            <li key={f.id} className="admin-ficha-list-item">
              <Link
                href={`/materia/${row.id}/tema/${f.tema_numero}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-ficha-list-link"
              >
                <strong>Tema {f.tema_numero}</strong>
                <span>{f.titulo || "Sin título"}</span>
              </Link>
              <button
                type="button"
                className="btn-danger btn-sm"
                disabled={busy !== null}
                onClick={() => void deleteFicha(f.id, f.tema_numero)}
              >
                {busy === f.id ? "…" : "Borrar"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Aún no hay fichas por tema en esta materia.</p>
      )}

      <div className="form-actions admin-resumen-actions">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy !== null || !canImport}
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
      </div>
    </div>
  );
}
