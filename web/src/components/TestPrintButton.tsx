"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bundleToSections,
  totalPreguntas,
  type PrintablePregunta,
  type PrintSection,
} from "@/lib/print-test";
import { printQueryParams } from "@/lib/print-url";

export type { PrintablePregunta, PrintSection };

type AnswerStyle = "key-at-end" | "inline";

type Props = {
  title: string;
  subtitle?: string;
  preguntas?: PrintablePregunta[];
  sections?: PrintSection[];
  materiaId?: string;
  bancoId?: string;
  /** Ruta /imprimir/simulacro?... para simulacros */
  printUrl?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
};

function normalizeSections(
  preguntas?: PrintablePregunta[],
  sections?: PrintSection[],
): PrintSection[] {
  if (sections?.length) return sections.filter((s) => s.preguntas.length > 0);
  if (preguntas?.length) return [{ title: "", preguntas }];
  return [];
}

function appendQuery(base: string, extra: string): string {
  if (!extra) return base;
  return base.includes("?") ? `${base}&${extra.slice(1)}` : `${base}${extra}`;
}

function filenameFromResponse(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(cd);
  return match?.[1] ?? `${fallback}.pdf`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pdfEtaHint(questionCount: number): string {
  if (questionCount >= 80) return "Puede tardar hasta 20 segundos.";
  if (questionCount >= 25) return "Suele tardar unos 10 segundos.";
  return "Suele tardar unos 5 segundos.";
}

function pdfEstimateMs(questionCount: number): number {
  return Math.min(22_000, Math.max(5_000, 4_000 + questionCount * 90));
}

export function TestPrintButton({
  title,
  subtitle: subtitleProp,
  preguntas,
  sections: sectionsProp,
  materiaId,
  bancoId,
  printUrl,
  className = "",
  label = "PDF",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("key-at-end");
  const [showExplanations, setShowExplanations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [loadedSections, setLoadedSections] = useState<PrintSection[] | null>(null);
  const [loadedSubtitle, setLoadedSubtitle] = useState<string | undefined>();
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);

  const staticSections = useMemo(
    () => normalizeSections(preguntas, sectionsProp),
    [preguntas, sectionsProp],
  );

  const usesRemoteBundle = Boolean(bancoId || materiaId);
  const isSimulacro = Boolean(printUrl?.startsWith("/imprimir/simulacro"));

  const dialogTitle = loadedTitle ?? title;
  const dialogSubtitle = loadedSubtitle ?? subtitleProp;
  const dialogCount = totalPreguntas(
    usesRemoteBundle ? (loadedSections ?? []) : staticSections,
  );

  useEffect(() => {
    if (!open || !usesRemoteBundle) return;

    setLoading(true);
    setFetchErr(null);
    setLoadedSections(null);

    const url = materiaId
      ? `/api/print/materia?materiaId=${encodeURIComponent(materiaId)}`
      : `/api/print/banco/${encodeURIComponent(bancoId!)}`;

    void fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar");
        setLoadedTitle(data.title as string);
        setLoadedSubtitle(data.subtitle as string);
        setLoadedSections(bundleToSections(data));
      })
      .catch((e) => {
        setFetchErr(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => setLoading(false));
  }, [open, materiaId, bancoId, usesRemoteBundle]);

  useEffect(() => {
    if (!downloading) {
      setDownloadProgress(0);
      return;
    }

    setDownloadProgress(8);
    const start = Date.now();
    const estimateMs = pdfEstimateMs(dialogCount);

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const ratio = Math.min(1, elapsed / estimateMs);
      setDownloadProgress(Math.min(92, 8 + ratio * 84));
    }, 180);

    return () => window.clearInterval(timer);
  }, [downloading, dialogCount]);

  function buildPdfRequest():
    | { url: string; method: "GET" }
    | { url: string; method: "POST"; body: object } {
    const qs = printQueryParams({ answerStyle, showExplanations });

    if (bancoId) {
      return {
        method: "GET",
        url: appendQuery(`/api/print/banco/${encodeURIComponent(bancoId)}/pdf`, qs),
      };
    }
    if (materiaId) {
      return {
        method: "GET",
        url: appendQuery(
          `/api/print/materia/pdf?materiaId=${encodeURIComponent(materiaId)}`,
          qs,
        ),
      };
    }
    if (isSimulacro && printUrl) {
      const params = new URL(printUrl, window.location.origin).searchParams.toString();
      return {
        method: "GET",
        url: appendQuery(`/api/print/simulacro/pdf?${params}`, qs),
      };
    }

    return {
      method: "POST",
      url: "/api/print/document/pdf",
      body: {
        title: dialogTitle,
        subtitle: dialogSubtitle,
        sections: staticSections,
        answerStyle,
        showExplanations,
      },
    };
  }

  async function downloadPdf() {
    if (usesRemoteBundle && loading) return;
    if (!usesRemoteBundle && !isSimulacro && !staticSections.length) return;

    setActionErr(null);
    setDownloading(true);

    try {
      const req = buildPdfRequest();
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Error al generar PDF");
      }

      const blob = await res.blob();
      setDownloadProgress(100);
      triggerDownload(blob, filenameFromResponse(res, dialogTitle));
      setOpen(false);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  }

  const canShow = usesRemoteBundle || isSimulacro || staticSections.length > 0;
  if (!canShow) return null;

  const ready = usesRemoteBundle ? !loading && !fetchErr : true;

  return (
    <>
      <button
        type="button"
        className={`btn-secondary btn-sm no-print ${className}`.trim()}
        disabled={disabled || downloading}
        onClick={() => {
          setActionErr(null);
          setOpen(true);
        }}
      >
        {downloading ? "Generando PDF…" : label}
      </button>

      {open && (
        <div className="settings-overlay no-print" role="dialog" aria-modal="true">
          <button
            type="button"
            className="settings-backdrop"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <div className="settings-panel card card-elevated print-options-panel">
            <div className="settings-panel-head">
              <h2 style={{ margin: 0 }}>
                {materiaId
                  ? "Descargar materia en PDF"
                  : bancoId
                    ? "Descargar banco en PDF"
                    : isSimulacro
                      ? "Descargar simulacro en PDF"
                      : "Descargar test en PDF"}
              </h2>
              <button type="button" className="btn-link btn-sm" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            {loading && <p className="muted small">Cargando preguntas…</p>}
            {fetchErr && <p className="error">{fetchErr}</p>}
            {actionErr && <p className="error">{actionErr}</p>}

            {ready && (
              <>
                <p className="muted small">
                  <strong>{dialogTitle}</strong>
                  {dialogSubtitle
                    ? ` — ${dialogSubtitle}`
                    : dialogCount
                      ? ` — ${dialogCount} pregunta${dialogCount !== 1 ? "s" : ""}`
                      : ""}
                </p>

                {materiaId && loadedSections && loadedSections.length > 1 && (
                  <ul className="print-bundle-preview muted small">
                    {loadedSections.map((s) => (
                      <li key={s.title}>
                        {s.title} ({s.preguntas.length})
                      </li>
                    ))}
                  </ul>
                )}

                <fieldset className="settings-group">
                  <legend>Formato</legend>
                  <label className="settings-option">
                    <input
                      type="radio"
                      name="printAnswers"
                      checked={answerStyle === "key-at-end"}
                      onChange={() => setAnswerStyle("key-at-end")}
                    />
                    <span>
                      <strong>Preguntas sin marcar</strong> — solucionario al final
                    </span>
                  </label>
                  <label className="settings-option">
                    <input
                      type="radio"
                      name="printAnswers"
                      checked={answerStyle === "inline"}
                      onChange={() => setAnswerStyle("inline")}
                    />
                    <span>
                      <strong>Respuestas en cada pregunta</strong>
                    </span>
                  </label>
                </fieldset>

                <label className="settings-option print-explain-toggle">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                  />
                  <span>
                    {answerStyle === "key-at-end"
                      ? "Incluir explicaciones en el solucionario"
                      : "Incluir explicaciones bajo cada pregunta"}
                  </span>
                </label>

                {downloading ? (
                  <div className="print-pdf-progress">
                    <p className="muted small print-pdf-progress-hint">
                      Generando PDF… {pdfEtaHint(dialogCount)}
                    </p>
                    <div
                      className="test-progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(downloadProgress)}
                      aria-label="Generando PDF"
                    >
                      <div
                        className="test-progress-bar"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={downloading}
                    onClick={() => void downloadPdf()}
                  >
                    {downloading ? "Generando PDF…" : "Descargar PDF"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
