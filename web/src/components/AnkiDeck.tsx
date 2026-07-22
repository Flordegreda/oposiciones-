"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exam-utils";
import type { FichaCard } from "@/lib/queries/fichas";

const EXIT_HREF = "/fichas";

type Props = {
  fichas: FichaCard[];
};

export function AnkiDeck({ fichas }: Props) {
  const cards = useMemo(() => fichas, [fichas]);
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
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

  const reshuffle = useCallback(() => {
    setOrder(shuffle(cards.map((_, i) => i)));
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

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
        <p className="muted">Este mazo no tiene fichas.</p>
        <Link href={EXIT_HREF} className="btn-primary">
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
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={index >= total - 1}
          onClick={() => goTo(index + 1)}
        >
          Siguiente →
        </button>
      </div>

      <p className="muted small flashcard-swipe-hint">
        Desliza para cambiar · Toca la tarjeta para voltear
      </p>

      <div className="flashcard-exit-bar">
        <Link href={EXIT_HREF} className="btn-primary flashcard-finish-btn">
          Finalizar
        </Link>
      </div>
    </div>
  );
}
