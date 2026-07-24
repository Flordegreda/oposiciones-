"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exam-utils";
import {
  beginFichaDeckOrder,
  clearFichaDeckSession,
  persistFichaDeckOrder,
} from "@/lib/ficha-deck-storage";
import type { FichaCard } from "@/lib/queries/fichas";

const EXIT_HREF = "/fichas";

type Props = {
  mazoId: string;
  fichas: FichaCard[];
  exitHref?: string;
};

export function AnkiDeck({ mazoId, fichas, exitHref = EXIT_HREF }: Props) {
  const cards = useMemo(() => fichas, [fichas]);
  const sessionScope = `ficha:${mazoId}`;
  const [order, setOrder] = useState(() => beginFichaDeckOrder(sessionScope, cards));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const total = order.length;
  const current = order[index] !== undefined ? cards[order[index]] : null;

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      setIndex(next);
      setFlipped(false);
    },
    [total],
  );

  const advance = useCallback(() => {
    if (index >= total - 1) {
      setFlipped(false);
      return;
    }
    goTo(index + 1);
  }, [index, total, goTo]);

  const reshuffle = useCallback(() => {
    const next = shuffle(cards.map((_, i) => i));
    setOrder(next);
    persistFichaDeckOrder(sessionScope, cards, next);
    setIndex(0);
    setFlipped(false);
  }, [cards, sessionScope]);

  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || flipped) return;
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
        <p className="muted">Este mazo no tiene fichas.</p>
        <Link href={exitHref} className="btn-primary" onClick={() => clearFichaDeckSession(sessionScope)}>
          Volver a Fichas
        </Link>
      </div>
    );
  }

  return (
    <div className="flashcard-deck">
      <div className="flashcard-toolbar">
        <span className="flashcard-count">
          {index + 1} / {total}
        </span>
        <button type="button" className="btn-secondary btn-sm" onClick={reshuffle}>
          Mezclar
        </button>
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
            <p className="flashcard-label">Pregunta</p>
            <p className="flashcard-enunciado">{current.frente}</p>
            <p className="flashcard-tap-hint muted small">Toca para ver la respuesta</p>
          </div>

          <div className="flashcard-face flashcard-face--back">
            <p className="flashcard-label">Respuesta</p>
            <p className="flashcard-answer">{current.dorso}</p>
            <p className="flashcard-tap-hint muted small">¿La sabías?</p>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="flashcard-nav flashcard-grade">
          <button type="button" className="btn-secondary" onClick={advance}>
            No sé
          </button>
          <button type="button" className="btn-primary" onClick={advance}>
            Sé
          </button>
        </div>
      ) : (
        <div className="flashcard-nav">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={index >= total - 1}
            onClick={() => goTo(index + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      <p className="muted small flashcard-swipe-hint">
        {flipped
          ? "Sé / No sé = siguiente tarjeta"
          : "Toca la tarjeta para voltear · luego Sé / No sé"}
      </p>

      <div className="flashcard-exit-bar">
        <Link
          href={exitHref}
          className="btn-primary flashcard-finish-btn"
          onClick={() => clearFichaDeckSession(sessionScope)}
        >
          Finalizar
        </Link>
      </div>
    </div>
  );
}
