"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImportMode, ImportPreview } from "@/lib/import-backup";

type Props = { schemaOk: boolean };

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminBackup({ schemaOk }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<{ backup: unknown; file: File } | null>(null);

  const [busy, setBusy] = useState<"export" | "import" | "preview" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastStats, setLastStats] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function exportarTodo() {
    setBusy("export");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al exportar");
      }
      const backup = await res.json();
      const date = backup.exportedAt?.slice(0, 10) ?? "backup";
      downloadJson(backup, `oposiciones-jex-backup-${date}.json`);
      const s = backup.stats;
      setLastStats(
        s ? `${s.materias} materias · ${s.bancos} bancos · ${s.preguntas} preguntas` : null,
      );
      setMsg("Copia de seguridad descargada.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function analizarArchivo(file: File, mode: ImportMode) {
    setBusy("preview");
    setErr(null);
    setMsg(null);
    try {
      const backup = JSON.parse(await file.text());
      const res = await fetch("/api/admin/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...backup, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al analizar");
      pendingRef.current = { backup, file };
      setPreview(data.preview as ImportPreview);
      setImportMode(mode);
      setShowConfirm(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al leer el JSON");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setBusy(null);
    }
  }

  async function confirmarImportacion() {
    const pending = pendingRef.current;
    if (!pending || !preview) return;

    setBusy("import");
    setErr(null);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(pending.backup as object), mode: importMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");

      const parts = [
        `${data.inserted ?? 0} banco(s) nuevo(s)`,
        data.updated ? `${data.updated} actualizado(s)` : null,
        `${data.skipped ?? 0} omitido(s)`,
        data.materiasCreated ? `${data.materiasCreated} materia(s) nueva(s)` : null,
      ].filter(Boolean);

      setMsg(`Restauración completada: ${parts.join(" · ")}.`);
      pendingRef.current = null;
      setPreview(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function cancelarPreview() {
    setShowConfirm(false);
    setPreview(null);
    pendingRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <div className="card card-elevated">
        <h2>Exportar base de datos</h2>
        <p className="muted small">
          Descarga un JSON con <strong>todas las materias, bancos y preguntas</strong>.
        </p>
        {lastStats && (
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            Última exportación: {lastStats}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={busy !== null}
            onClick={() => void exportarTodo()}
          >
            {busy === "export" ? "Exportando…" : "Descargar copia completa"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Restaurar copia de seguridad</h2>
        <p className="muted small">
          Elige el modo y un archivo <code>.json</code>. Verás una vista previa antes de
          confirmar.
        </p>

        <fieldset className="settings-group" style={{ marginTop: "1rem" }}>
          <legend>Modo de restauración</legend>
          <label className="settings-option">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "append"}
              onChange={() => setImportMode("append")}
            />
            <span>
              <strong>Solo añadir nuevos</strong> — omite bancos que ya existen
            </span>
          </label>
          <label className="settings-option">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "overwrite"}
              onChange={() => setImportMode("overwrite")}
            />
            <span>
              <strong>Sobrescribir bancos</strong> — reemplaza preguntas de bancos existentes
              (¡cuidado!)
            </span>
          </label>
        </fieldset>

        {!schemaOk && (
          <p className="muted small">
            Primero crea la tabla <code>preguntas</code> (tarjeta amarilla arriba).
          </p>
        )}

        <label className="file-upload">
          <span className="btn-secondary">
            {busy === "preview" ? "Analizando…" : "Elegir archivo JSON"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            disabled={!schemaOk || busy !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void analizarArchivo(f, importMode);
            }}
          />
        </label>
      </div>

      {showConfirm && preview && (
        <div className="settings-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="settings-backdrop"
            aria-label="Cancelar"
            onClick={cancelarPreview}
          />
          <div className="settings-panel card card-elevated import-preview-panel">
            <h2 style={{ marginTop: 0 }}>Vista previa de la restauración</h2>
            <p className="muted small">
              Modo:{" "}
              <strong>{importMode === "overwrite" ? "Sobrescribir bancos" : "Solo añadir nuevos"}</strong>
            </p>
            <ul className="import-preview-list">
              <li>
                <strong>{preview.materias}</strong> materia(s)
              </li>
              <li>
                <strong>{preview.bancosNuevos}</strong> banco(s) nuevo(s) ·{" "}
                <strong>{preview.preguntasNuevas}</strong> pregunta(s)
              </li>
              {preview.bancosExistentes > 0 && (
                <li>
                  <strong>{preview.bancosExistentes}</strong> banco(s) ya existente(s)
                  {importMode === "append"
                    ? " — se omitirán"
                    : ` — se sobrescribirán (${preview.preguntasSobrescritura} preg.)`}
                </li>
              )}
              {preview.bancosVacios > 0 && (
                <li className="muted">
                  {preview.bancosVacios} banco(s) vacío(s) en el JSON — se ignorarán
                </li>
              )}
              <li>
                Total preguntas a importar: <strong>{preview.preguntasTotales}</strong>
              </li>
            </ul>

            {importMode === "overwrite" && preview.bancosExistentes > 0 && (
              <p className="info-box sim-info">
                Sobrescribir borra las preguntas actuales de esos bancos y las sustituye por las
                del JSON.
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={busy !== null || preview.preguntasTotales === 0}
                onClick={() => void confirmarImportacion()}
              >
                {busy === "import" ? "Importando…" : "Confirmar restauración"}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelarPreview}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </>
  );
}
