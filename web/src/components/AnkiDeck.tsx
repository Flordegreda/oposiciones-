"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exam-utils";
import {
  beginFichaDeckOrder,
  clearFichaDeckSession,
  persistFichaDeckOrder,
} from "@/lib/ficha-deck-storage";
import { clearSeguir, rememberSeguir } from "@/lib/study-continue";
import type { FichaCard } from "@/lib/queries/fichas";

const EXIT_HREF = "/fichas";

type Props = {
  mazoId: string;
  mazoNombre?: string;
  fichas: FichaCard[];
  exitHref?: string;
};

export function AnkiDeck({ mazoId, mazoNombre, fichas, exitHref = EXIT_HREF }: Props) {
  const cards = useMemo(() => fichas, [fichas]);
  const sessionScope = `ficha:${mazoId}`;
  const title = mazoNombre?.trim() || "Mazo";
  const total = cards.length;

  const [remaining, setRemaining] = useState(
    () => beginFichaDeckOrder(sessionScope, cards).remaining,
  );
  const [flipped, setFlipped] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const skipClickRef = useRef(false);

  const known = Math.max(0, total - remaining.length);
  const current = remaining[0] !== undefined ? cards[remaining[0]] : null;

  useEffect(() => {
    if (!remaining.length) return;
    rememberSeguir({
      kind: "ficha",
      id: mazoId,
      title,
      href: `/fichas/${mazoId}`,
      hint: `${known} de ${total} · ${remaining.length} pendientes`,
    });
    // Solo al abrir el mazo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (next: number[]) => {
      persistFichaDeckOrder(sessionScope, cards, next);
      if (next.length === 0) {
        clearFichaDeckSession(sessionScope);
        clearSeguir("ficha", mazoId);
        return;
      }
      rememberSeguir({
        kind: "ficha",
        id: mazoId,
        title,
        href: `/fichas/${mazoId}`,
        hint: `${total - next.length} de ${total} · ${next.length} pendientes`,
      });
    },
    [cards, mazoId, sessionScope, title, total],
  );

  const grade = useCallback(
    (knew: boolean) => {
      setRemaining((prev) => {
        if (!prev.length) return prev;
        const next = knew
          ? prev.slice(1)
          : prev.length === 1
            ? prev
            : [...prev.slice(1), prev[0]!];
        persist(next);
        return next;
      });
      setFlipped(false);
    },
    [persist],
  );

  const reshuffle = useCallback(() => {
    const order = shuffle(cards.map((_, i) => i));
    setRemaining(order);
    persist(order);
    setFlipped(false);
  }, [cards, persist]);

  const progress = total ? Math.round((known / total) * 100) : 0;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || !flipped) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    skipClickRef.current = true;
    if (dx < 0) grade(true);
    else grade(false);
  }

  if (!current) {
    return (
      <div className="card">
        <p className="ok" style={{ marginTop: 0 }}>
          Mazo completado. Has marcado «Sé» en las {total} fichas.
        </p>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={reshuffle}>
            Repasar otra vez
          </button>
          <Link
            href={exitHref}
            className="btn-secondary"
            onClick={() => {
              clearFichaDeckSession(sessionScope);
              clearSeguir("ficha", mazoId);
            }}
          >
            Volver a Fichas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-deck">
      <div className="flashcard-toolbar">
        <span className="flashcard-count">
          {known} sé · {remaining.length} pendiente{remaining.length !== 1 ? "s" : ""}
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
        onClick={() => {
          if (skipClickRef.current) {
            skipClickRef.current = false;
            return;
          }
          setFlipped((f) => !f);
        }}
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
          <button type="button" className="btn-secondary" onClick={() => grade(false)}>
            No sé
          </button>
          <button type="button" className="btn-primary" onClick={() => grade(true)}>
            Sé
          </button>
        </div>
      ) : (
        <p className="muted small flashcard-swipe-hint" style={{ margin: 0 }}>
          Voltea la tarjeta y elige. «No sé» la manda al final del mazo.
        </p>
      )}

      {flipped && (
        <p className="muted small flashcard-swipe-hint">
          {remaining.length === 1
            ? "Última ficha: «Sé» para terminar, «No sé» para repetirla."
            : "No sé = vuelve al final · Sé = no se repite"}
        </p>
      )}

      <div className="flashcard-exit-bar">
        <Link
          href={exitHref}
          className="btn-primary flashcard-finish-btn"
          onClick={() => persist(remaining)}
        >
          {known > 0 && remaining.length > 0 ? "Seguir luego" : "Finalizar"}
        </Link>
      </div>
    </div>
  );
}
