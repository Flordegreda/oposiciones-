"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bundleToSections,
  flattenSections,
  totalPreguntas,
  type PrintablePregunta,
  type PrintSection,
} from "@/lib/print-test";

export type { PrintablePregunta, PrintSection };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type AnswerStyle = "key-at-end" | "inline";

type PrintJob = {
  answerStyle: AnswerStyle;
  showExplanations: boolean;
  sections: PrintSection[];
  subtitle?: string;
  title: string;
};

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

function TestPrintSheet({
  title,
  subtitle,
  sections,
  answerStyle,
  showExplanations,
}: {
  title: string;
  subtitle?: string;
  sections: PrintSection[];
} & Omit<PrintJob, "sections" | "title" | "subtitle">) {
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const inline = answerStyle === "inline";
  const flat = flattenSections(sections);
  const multi = sections.length > 1 || sections.some((s) => s.title);

  let counter = 0;

  return (
    <div className="print-sheet">
      <header className="print-sheet-head">
        <h1 className="print-sheet-title">{title}</h1>
        {subtitle && <p className="print-sheet-sub">{subtitle}</p>}
        <p className="print-sheet-meta">
          {flat.length} pregunta{flat.length !== 1 ? "s" : ""} · {date}
          {multi && sections.length > 1 ? ` · ${sections.length} bancos` : ""}
          {inline ? " · Respuestas marcadas en cada pregunta" : " · Solucionario al final"}
        </p>
      </header>

      {sections.map((section, si) => (
        <div key={`${section.title}-${si}`} className="print-banco-block">
          {section.title && (
            <h2 className="print-banco-title">
              {section.title}
              <span className="print-banco-count">
                {" "}
                ({section.preguntas.length} preg.)
              </span>
            </h2>
          )}
          <ol className="print-question-list">
            {section.preguntas.map((q, qi) => {
              counter += 1;
              const num = counter;
              return (
                <li key={`${si}-${qi}`} className="print-question-item">
                  <p className="print-question-text">
                    <span className="print-question-num">{num}.</span> {q.enunciado}
                  </p>
                  <ul className="print-option-list">
                    {q.opciones.map((opt, oi) => {
                      const correct = oi === q.respuesta;
                      return (
                        <li
                          key={oi}
                          className={`print-option${inline && correct ? " print-option--correct" : ""}`}
                        >
                          <span className="print-option-letter">{LETTERS[oi]})</span> {opt}
                          {inline && correct && (
                            <span className="print-option-mark"> ✓ Correcta</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {inline && showExplanations && q.explicacion?.trim() && (
                    <p className="print-explanation">
                      <strong>Explicación:</strong> {q.explicacion}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {!inline && (
        <section className="print-answer-key">
          <h2 className="print-answer-key-title">Plantilla de respuestas correctas</h2>
          <ol className="print-answer-key-list">
            {flat.map((q, i) => (
              <li key={i} className="print-answer-key-item">
                <span className="print-answer-key-num">{i + 1}.</span>{" "}
                <strong>{LETTERS[q.respuesta] ?? "?"}</strong>
                {showExplanations && q.explicacion?.trim() && (
                  <span className="print-answer-key-explain"> — {q.explicacion}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

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
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
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

  useEffect(() => setMounted(true), []);

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
  }, [open, materiaId, bancoId]);

  const clearPrint = useCallback(() => {
    setPrintJob(null);
    document.body.classList.remove("is-printing");
  }, []);

  useEffect(() => {
    const onAfterPrint = () => clearPrint();
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [clearPrint]);

  function startPrint() {
    if (!dialogSections.length) return;
    setOpen(false);
    setPrintJob({
      answerStyle,
      showExplanations,
      sections: dialogSections,
      subtitle: dialogSubtitle,
      title: dialogTitle,
    });
    document.body.classList.add("is-printing");
    window.setTimeout(() => window.print(), 120);
  }

  const canShow = materiaId || bancoId || printUrl ? true : staticSections.length > 0;
  if (!canShow) return null;

  return (
    <>
      <button
        type="button"
        className={`btn-secondary btn-sm no-print ${className}`.trim()}
        disabled={disabled}
        onClick={() => setOpen(true)}
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

      {mounted &&
        printJob &&
        createPortal(
          <div className="print-portal" aria-hidden>
            <TestPrintSheet
              title={printJob.title}
              subtitle={printJob.subtitle}
              sections={printJob.sections}
              answerStyle={printJob.answerStyle}
              showExplanations={printJob.showExplanations}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
