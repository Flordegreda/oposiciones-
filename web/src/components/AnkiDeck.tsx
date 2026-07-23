"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/exam-utils";
import { getDispositivoId } from "@/lib/dispositivo-id";
import type { FichaCard } from "@/lib/queries/fichas";

const EXIT_HREF = "/fichas";

type Props = {
  fichas: FichaCard[];
  mazoId?: string;
  /** Solo cola «No sé»: al marcar Sé se quita y al acabar se recarga. */
  repasoMode?: boolean;
  exitHref?: string;
  onQueueEmpty?: () => void;
};

export function AnkiDeck({
  fichas,
  mazoId,
  repasoMode = false,
  exitHref = EXIT_HREF,
  onQueueEmpty,
}: Props) {
  const cards = useMemo(() => fichas, [fichas]);
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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

  const advanceAfterGrade = useCallback(() => {
    if (index >= total - 1) {
      if (repasoMode) {
        setDone(true);
        onQueueEmpty?.();
      } else {
        setFlipped(false);
      }
      return;
    }
    goTo(index + 1);
  }, [index, total, repasoMode, goTo, onQueueEmpty]);

  const grade = useCallback(
    async (know: boolean) => {
      if (!current || busy) return;
      setBusy(true);
      const dispositivoId = getDispositivoId();
      try {
        if (know) {
          await fetch("/api/repaso/fichas", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dispositivoId, fichaId: current.id }),
          });
        } else {
          await fetch("/api/repaso/fichas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dispositivoId,
              fichaId: current.id,
              mazoId: mazoId || undefined,
            }),
          });
        }
      } catch {
        /* no bloquear el estudio si falla la red */
      } finally {
        setBusy(false);
        advanceAfterGrade();
      }
    },
    [current, busy, mazoId, advanceAfterGrade],
  );

  const reshuffle = useCallback(() => {
    setOrder(shuffle(cards.map((_, i) => i)));
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }, [cards]);

  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || flipped) return; // con respuesta visible, priorizar Sé/No sé
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goTo(index + 1);
    else goTo(index - 1);
  }

  if (done) {
    return (
      <div className="card">
        <h2>Repaso de fichas listo</h2>
        <p className="muted">
          Has pasado la cola. Las que marcaste «No sé» siguen guardadas con tu código de
          sync.
        </p>
        <Link href={exitHref} className="btn-primary">
          Volver a Fichas
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="card">
        <p className="muted">
          {repasoMode ? "No hay fichas pendientes de «No sé»." : "Este mazo no tiene fichas."}
        </p>
        <Link href={exitHref} className="btn-primary">
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
          {repasoMode ? " · No sé" : ""}
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
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void grade(false)}
          >
            No sé
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => void grade(true)}
          >
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
          ? "Sé = sale de la cola · No sé = se guarda para otro día (mismo código JEX)"
          : "Toca la tarjeta para voltear · luego Sé / No sé"}
      </p>

      <div className="flashcard-exit-bar">
        <Link href={exitHref} className="btn-primary flashcard-finish-btn">
          Finalizar
        </Link>
      </div>
    </div>
  );
}
