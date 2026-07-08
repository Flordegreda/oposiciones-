"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bundleToSections,
  totalPreguntas,
  type PrintablePregunta,
  type PrintSection,
} from "@/lib/print-test";
import { buildPrintHtml, openPrintDocument } from "@/lib/print-html";

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
  /** URL personalizada de la que cargar el bundle de impresión */
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

  const dialogSections = materiaId || bancoId || printUrl ? (loadedSections ?? []) : staticSections;
  const dialogCount = totalPreguntas(dialogSections);
  const dialogTitle = loadedTitle ?? title;
  const dialogSubtitle = loadedSubtitle ?? subtitleProp;

  useEffect(() => {
    if (!open || (!materiaId && !bancoId && !printUrl)) return;

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

  function startPrint() {
    if (!dialogSections.length) return;
    setPrintErr(null);

    const html = buildPrintHtml({
      title: dialogTitle,
      subtitle: dialogSubtitle,
      sections: dialogSections,
      answerStyle,
      showExplanations,
    });

    const mode = openPrintDocument(html);
    if (mode === "blocked") {
      setPrintErr(
        "No se pudo abrir la ventana de impresión. Permite ventanas emergentes para este sitio e inténtalo de nuevo.",
      );
      return;
    }

    setOpen(false);
  }

  const canShow = materiaId || bancoId || printUrl ? true : staticSections.length > 0;
  if (!canShow) return null;

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

            {!loading && !fetchErr && (
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
                    disabled={!dialogCount}
                    onClick={startPrint}
                  >
                    Imprimir ahora
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
