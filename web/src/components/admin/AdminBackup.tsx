"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = { schemaOk: boolean };

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
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
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastStats, setLastStats] = useState<string | null>(null);

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
        s
          ? `${s.materias} materias · ${s.bancos} bancos · ${s.preguntas} preguntas`
          : null,
      );
      setMsg("Copia de seguridad descargada.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function importarArchivo(file: File) {
    setBusy("import");
    setErr(null);
    setMsg(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");
      setMsg(
        `Importado: ${data.inserted} banco(s) nuevo(s). Ya existían: ${data.skipped}. Materias nuevas: ${data.materiasCreated}.`,
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al leer el JSON");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div className="card card-elevated">
        <h2>Exportar base de datos</h2>
        <p className="muted small">
          Descarga un JSON con <strong>todas las materias, bancos y preguntas</strong>.
          Guárdalo en otro PC o como copia de seguridad.
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
          Sube un <code>.json</code> exportado antes (o un backup antiguo compatible).
          Los bancos que ya existan se omiten; solo se añaden los nuevos.
        </p>
        {!schemaOk && (
          <p className="muted small">
            Primero crea la tabla <code>preguntas</code> (tarjeta amarilla arriba).
          </p>
        )}
        <label className="file-upload">
          <span className="btn-secondary">
            {busy === "import" ? "Importando…" : "Elegir archivo JSON"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            disabled={!schemaOk || busy !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importarArchivo(f);
            }}
          />
        </label>
      </div>

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </>
  );
}
