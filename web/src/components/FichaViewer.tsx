"use client";

import { useMemo, useState } from "react";
import { MateriaResumenBody } from "@/components/MateriaResumenBody";
import { extractTrampas, splitFichaSections, type FichaSection } from "@/lib/ficha-utils";

type ViewMode = "secciones" | "trampas" | "completa";

type Props = {
  temaNumero: number;
  titulo: string;
  content: string;
  materiaNombre?: string;
};

function SectionBlock({ section, defaultOpen }: { section: FichaSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="ficha-section" open={open}>
      <summary
        className="ficha-section-summary"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <span className="ficha-section-title">{section.title}</span>
        <span className="ficha-section-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </summary>
      <div className="ficha-section-body">
        <MateriaResumenBody content={section.body} />
      </div>
    </details>
  );
}

export function FichaViewer({ temaNumero, titulo, content, materiaNombre }: Props) {
  const [mode, setMode] = useState<ViewMode>("secciones");

  const sections = useMemo(() => splitFichaSections(content), [content]);
  const trampas = useMemo(() => extractTrampas(content), [content]);

  return (
    <div className="ficha-viewer">
      <header className="ficha-viewer-head">
        <p className="ficha-viewer-eyebrow">
          {materiaNombre ? `${materiaNombre} · ` : ""}Tema {temaNumero}
        </p>
        <h2 className="ficha-viewer-title">{titulo}</h2>
        <div className="ficha-viewer-tabs" role="tablist" aria-label="Modo de lectura">
          <button
            type="button"
            role="tab"
            className={`ficha-tab${mode === "secciones" ? " ficha-tab--active" : ""}`}
            aria-selected={mode === "secciones"}
            onClick={() => setMode("secciones")}
          >
            Secciones ({sections.length})
          </button>
          <button
            type="button"
            role="tab"
            className={`ficha-tab${mode === "trampas" ? " ficha-tab--active" : ""}`}
            aria-selected={mode === "trampas"}
            onClick={() => setMode("trampas")}
          >
            Trampas ({trampas.length})
          </button>
          <button
            type="button"
            role="tab"
            className={`ficha-tab${mode === "completa" ? " ficha-tab--active" : ""}`}
            aria-selected={mode === "completa"}
            onClick={() => setMode("completa")}
          >
            Completa
          </button>
        </div>
      </header>

      {mode === "secciones" && (
        <div className="ficha-sections">
          {sections.map((section, i) => (
            <SectionBlock key={section.id} section={section} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {mode === "trampas" && (
        <div className="ficha-trampas">
          {trampas.length === 0 ? (
            <p className="muted">No se detectaron recuadros 📌 en esta ficha.</p>
          ) : (
            trampas.map((t, i) => (
              <article key={t.id} className="ficha-trampa-card">
                <span className="ficha-trampa-num">{i + 1}</span>
                <p>{t.text}</p>
              </article>
            ))
          )}
        </div>
      )}

      {mode === "completa" && (
        <div className="ficha-completa card resumen-card">
          <MateriaResumenBody content={content} />
        </div>
      )}
    </div>
  );
}
