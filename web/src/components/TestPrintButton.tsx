"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bundleToSections,
  totalPreguntas,
  type PrintablePregunta,
  type PrintSection,
} from "@/lib/print-test";
import { PRINT_SESSION_KEY, printQueryParams } from "@/lib/print-url";

export type { PrintablePregunta, PrintSection };

type AnswerStyle = "key-at-end" | "inline";

type Props = {
  title: string;
  subtitle?: string;
  preguntas?: PrintablePregunta[];
  sections?: PrintSection[];
  /** Carga todos los bancos de la materia al abrir el diálogo */
  materiaId?: string;
  /** Carga un banco al abrir el diálogo (solucionario solo al imprimir) */
  bancoId?: string;
  /** Ruta /imprimir/... o API JSON legacy para vista previa del diálogo */
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

export function TestPrintButton({
  title,
  subtitle: subtitleProp,
  preguntas,
  sections: sectionsProp,
  materiaId,
  bancoId,
  printUrl,
  className = "",
  label = "Imprimir",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("key-at-end");
  const [showExplanations, setShowExplanations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [printErr, setPrintErr] = useState<string | null>(null);
  const [loadedSections, setLoadedSections] = useState<PrintSection[] | null>(null);
  const [loadedSubtitle, setLoadedSubtitle] = useState<string | undefined>();
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);

  const staticSections = useMemo(
    () => normalizeSections(preguntas, sectionsProp),
    [preguntas, sectionsProp],
  );

  const usesPrintPage = Boolean(
    bancoId || materiaId || (printUrl && printUrl.startsWith("/imprimir/")),
  );

  const dialogSections = usesPrintPage || printUrl ? (loadedSections ?? []) : staticSections;
  const dialogCount = totalPreguntas(
    usesPrintPage || printUrl ? dialogSections : staticSections,
  );
  const dialogTitle = loadedTitle ?? title;
  const dialogSubtitle = loadedSubtitle ?? subtitleProp;

  useEffect(() => {
    if (!open) return;
    if (printUrl?.startsWith("/imprimir/")) return;
    if (!materiaId && !bancoId && !printUrl) return;

    setLoading(true);
    setFetchErr(null);
    setLoadedSections(null);

    const url = printUrl
      ? printUrl
      : materiaId
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
  }, [open, materiaId, bancoId, printUrl]);

  function buildPrintPageUrl(): string {
    const qs = printQueryParams({ answerStyle, showExplanations });

    if (bancoId) {
      return appendQuery(`/imprimir/banco/${encodeURIComponent(bancoId)}`, qs);
    }
    if (materiaId) {
      return appendQuery(
        `/imprimir/materia?materiaId=${encodeURIComponent(materiaId)}`,
        qs,
      );
    }
    if (printUrl?.startsWith("/imprimir/")) {
      return appendQuery(printUrl, qs);
    }

    const sections = staticSections;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      sessionStorage.setItem(
        `${PRINT_SESSION_KEY}:${key}`,
        JSON.stringify({
          title: dialogTitle,
          subtitle: dialogSubtitle,
          sections,
          answerStyle,
          showExplanations,
        }),
      );
    } catch {
      throw new Error("No se pudo guardar el test para imprimir.");
    }
    return `/imprimir/sesion?k=${encodeURIComponent(key)}`;
  }

  function startPrint() {
    const sectionsForPrint = usesPrintPage || printUrl ? dialogSections : staticSections;
    if (!sectionsForPrint.length && !bancoId && !materiaId && !printUrl?.startsWith("/imprimir/")) {
      return;
    }

    setPrintErr(null);

    let url: string;
    try {
      url = buildPrintPageUrl();
    } catch (e) {
      setPrintErr(e instanceof Error ? e.message : "Error al preparar impresión");
      return;
    }

    const w = window.open(url, "_blank", "noopener");
    if (!w) {
      setPrintErr(
        "No se pudo abrir la pestaña de impresión. Permite ventanas emergentes para este sitio.",
      );
      return;
    }

    setOpen(false);
  }

  const canShow =
    bancoId || materiaId || printUrl ? true : staticSections.length > 0;
  if (!canShow) return null;

  const showDialogMeta = printUrl?.startsWith("/imprimir/")
    ? true
    : usesPrintPage
      ? !loading && !fetchErr
      : staticSections.length > 0;

  return (
    <>
      <button
        type="button"
        className={`btn-secondary btn-sm no-print ${className}`.trim()}
        disabled={disabled}
        onClick={() => {
          setPrintErr(null);
          setOpen(true);
        }}
      >
        {label}
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
                {printUrl
                  ? title
                  : materiaId
                    ? "Imprimir materia completa"
                    : bancoId
                      ? "Imprimir banco"
                      : "Imprimir test"}
              </h2>
              <button type="button" className="btn-link btn-sm" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            {loading && <p className="muted small">Cargando preguntas…</p>}
            {fetchErr && <p className="error">{fetchErr}</p>}
            {printErr && <p className="error">{printErr}</p>}

            {showDialogMeta && (
              <>
                <p className="muted small">
                  <strong>{dialogTitle}</strong>
                  {dialogSubtitle
                    ? ` — ${dialogSubtitle}`
                    : dialogCount
                      ? ` — ${dialogCount} pregunta${dialogCount !== 1 ? "s" : ""}`
                      : ""}
                </p>

                {materiaId && dialogSections.length > 1 && (
                  <ul className="print-bundle-preview muted small">
                    {dialogSections.map((s) => (
                      <li key={s.title}>
                        {s.title} ({s.preguntas.length})
                      </li>
                    ))}
                  </ul>
                )}

                <p className="muted small">
                  Se abrirá el test en una pestaña nueva. Usa <strong>Ctrl+P</strong> para imprimir.
                </p>

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

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={usesPrintPage && loading}
                    onClick={startPrint}
                  >
                    Abrir para imprimir
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
