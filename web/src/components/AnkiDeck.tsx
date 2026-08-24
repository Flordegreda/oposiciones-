"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exam-utils";
import {
  beginFichaDeckOrder,
  clearFichaDeckSession,
  persistFichaDeckOrder,
  type FichaDeckState,
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

  const [deck, setDeck] = useState<FichaDeckState>(() =>
    beginFichaDeckOrder(sessionScope, cards),
  );
  const [flipped, setFlipped] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const skipClickRef = useRef(false);

  const remaining = deck.remaining;
  const cursor = deck.cursor;
  const known = Math.max(0, total - remaining.length);
  const current = remaining[cursor] !== undefined ? cards[remaining[cursor]] : null;
  const canPrev = cursor > 0;
  const canNext = cursor < remaining.length - 1;

  const persist = useCallback(
    (next: FichaDeckState) => {
      persistFichaDeckOrder(sessionScope, cards, next.remaining, next.cursor);
      if (next.remaining.length === 0) {
        clearFichaDeckSession(sessionScope);
        clearSeguir("ficha", mazoId);
        return;
      }
      rememberSeguir({
        kind: "ficha",
        id: mazoId,
        title,
        href: `/fichas/${mazoId}`,
        hint: `${next.cursor + 1} de ${next.remaining.length} pendientes · ${total - next.remaining.length} sé`,
      });
    },
    [cards, mazoId, sessionScope, title, total],
  );

  useEffect(() => {
    if (!remaining.length) return;
    rememberSeguir({
      kind: "ficha",
      id: mazoId,
      title,
      href: `/fichas/${mazoId}`,
      hint: `${cursor + 1} de ${remaining.length} pendientes · ${known} sé`,
    });
    // Solo al abrir el mazo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDeck = useCallback(
    (next: FichaDeckState) => {
      setDeck(next);
      persist(next);
      setFlipped(false);
    },
    [persist],
  );

  const go = useCallback(
    (delta: number) => {
      const nextCursor = cursor + delta;
      if (nextCursor < 0 || nextCursor >= remaining.length) return;
      applyDeck({ remaining, cursor: nextCursor });
    },
    [applyDeck, cursor, remaining],
  );

  const grade = useCallback(
    (knew: boolean) => {
      if (!remaining.length) return;
      let nextRemaining: number[];
      let nextCursor: number;
      if (knew) {
        nextRemaining = remaining.filter((_, i) => i !== cursor);
        nextCursor = nextRemaining.length === 0 ? 0 : Math.min(cursor, nextRemaining.length - 1);
      } else if (remaining.length === 1) {
        nextRemaining = remaining;
        nextCursor = 0;
      } else {
        const currentIdx = remaining[cursor]!;
        nextRemaining = [...remaining.slice(0, cursor), ...remaining.slice(cursor + 1), currentIdx];
        nextCursor = cursor >= nextRemaining.length ? 0 : cursor;
      }
      applyDeck({ remaining: nextRemaining, cursor: nextCursor });
    },
    [applyDeck, cursor, remaining],
  );

  const reshuffle = useCallback(() => {
    const order = shuffle(cards.map((_, i) => i));
    applyDeck({ remaining: order, cursor: 0 });
  }, [applyDeck, cards]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const progress = total ? Math.round((known / total) * 100) : 0;

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
    skipClickRef.current = true;
    if (flipped) {
      if (dx < 0) grade(true);
      else grade(false);
      return;
    }
    if (dx < 0) go(1);
    else go(-1);
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
          {cursor + 1} / {remaining.length}
          {known > 0 ? ` · ${known} sé` : ""}
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

      <div className="flashcard-nav">
        <button
          type="button"
          className="btn-secondary"
          disabled={!canPrev}
          onClick={() => go(-1)}
        >
          ← Retroceder
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!canNext}
          onClick={() => go(1)}
        >
          Avanzar →
        </button>
      </div>

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
        <p className="muted small flashcard-swipe-hint">
          Voltea la tarjeta para marcar Sé / No sé. En el teclado: ← → y espacio.
        </p>
      )}

      <div className="flashcard-exit-bar">
        <Link
          href={exitHref}
          className="btn-primary flashcard-finish-btn"
          onClick={() => persist(deck)}
        >
          {known > 0 && remaining.length > 0 ? "Seguir luego" : "Finalizar"}
        </Link>
      </div>
    </div>
  );
}
