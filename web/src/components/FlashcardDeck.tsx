"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { SetPageHeader } from "@/components/page-header-context";
import { shuffle } from "@/lib/exam-utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type FlashcardPregunta = {
  id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string | null;
  supuestoTexto?: string | null;
  supuestoTitulo?: string | null;
};

type Props = {
  bancoNombre: string;
  preguntas: FlashcardPregunta[];
  /** Pantalla intermedia (p. ej. elegir modo test). */
  backHref: string;
  /** Salida al temario. */
  exitHref?: string;
};

export function FlashcardDeck({
  bancoNombre,
  preguntas,
  backHref,
  exitHref = "/practicar",
}: Props) {
  const [order, setOrder] = useState(() => preguntas.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const total = order.length;
  const current = order[index] !== undefined ? preguntas[order[index]] : null;

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      setIndex(next);
      setFlipped(false);
    },
    [total],
  );

  const reshuffle = useCallback(() => {
    setOrder(shuffle(preguntas.map((_, i) => i)));
    setIndex(0);
    setFlipped(false);
  }, [preguntas]);

  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  const answerLabel = useMemo(() => {
    if (!current) return "";
    const letter = LETTERS[current.respuesta] ?? "?";
    const text = current.opciones[current.respuesta]?.trim();
    return text ? `${letter}. ${text}` : letter;
  }, [current]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goTo(index + 1);
    else goTo(index - 1);
  }

  if (!current) {
    return (
      <div className="card">
        <p className="muted">Este banco no tiene preguntas.</p>
      </div>
    );
  }

  return (
    <div className="flashcard-deck">
      <SetPageHeader
        title={`Tarjetas · ${bancoNombre}`}
        backHref={exitHref}
        backLabel="Temario"
      />

      <div className="flashcard-toolbar">
        <span className="flashcard-count">
          {index + 1} / {total}
        </span>
        <div className="flashcard-toolbar-actions">
          <Link href={backHref} className="btn-secondary btn-sm">
            Modos
          </Link>
          <button type="button" className="btn-secondary btn-sm" onClick={reshuffle}>
            Mezclar
          </button>
        </div>
      </div>

      <div className="flashcard-progress" aria-hidden>
        <span className="flashcard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <button
        type="button"
        className="flashcard-scene"
        aria-label={flipped ? "Ocultar respuesta" : "Mostrar respuesta"}
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`flashcard-inner${flipped ? " flashcard-inner--flipped" : ""}`}>
          <div className="flashcard-face flashcard-face--front">
            {current.supuestoTexto && (
              <div className="flashcard-supuesto">
                {current.supuestoTitulo && (
                  <p className="flashcard-supuesto-title">{current.supuestoTitulo}</p>
                )}
                <p className="flashcard-supuesto-text">{current.supuestoTexto}</p>
              </div>
            )}
            <p className="flashcard-label">Pregunta</p>
            <p className="flashcard-enunciado">{current.enunciado}</p>
            <p className="flashcard-tap-hint muted small">Toca para ver la respuesta</p>
          </div>

          <div className="flashcard-face flashcard-face--back">
            <p className="flashcard-label">Respuesta</p>
            <p className="flashcard-answer">{answerLabel}</p>
            {current.explicacion?.trim() && (
              <>
                <p className="flashcard-label">Explicación</p>
                <p className="flashcard-explain">{current.explicacion}</p>
              </>
            )}
            <p className="flashcard-tap-hint muted small">Toca para volver</p>
          </div>
        </div>
      </button>

      <div className="flashcard-nav">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          ← Anterior
        </button>
        {index >= total - 1 ? (
          <Link href={exitHref} className="btn-primary btn-sm flashcard-finish-link">
            Finalizar
          </Link>
        ) : (
          <button type="button" className="btn-secondary btn-sm" onClick={() => goTo(index + 1)}>
            Siguiente →
          </button>
        )}
      </div>

      <div className="flashcard-exit">
        <Link href={exitHref} className="btn-primary flashcard-finish-btn">
          Finalizar y volver al temario
        </Link>
      </div>

      <p className="muted small flashcard-swipe-hint">Desliza izquierda o derecha para cambiar</p>
    </div>
  );
}
