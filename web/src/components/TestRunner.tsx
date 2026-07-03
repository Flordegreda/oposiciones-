"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { ExamSession, type SessionMeta } from "@/components/ExamSession";
import { TestPrintButton } from "@/components/TestPrintButton";
import { getFalloIds, isFavorito } from "@/lib/test-progress";

type Props = {
  bancoId: string;
  bancoNombre: string;
  preguntas: Omit<PublicExamPregunta, "bancoId">[];
};

type Session = {
  list: PublicExamPregunta[];
  examMode: boolean;
  meta: SessionMeta;
};

export function TestRunner({ bancoId, bancoNombre, preguntas: raw }: Props) {
  const allPreguntas = useMemo(
    () => raw.map((p) => ({ ...p, bancoId })),
    [raw, bancoId],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [examMode, setExamMode] = useState(false);
  const [failIds, setFailIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFailIds(getFalloIds(bancoId));
    setHydrated(true);
    const onSync = () => setFailIds(getFalloIds(bancoId));
    window.addEventListener("opo-progress-synced", onSync);
    return () => window.removeEventListener("opo-progress-synced", onSync);
  }, [bancoId]);

  const falloPreguntas = useMemo(
    () => allPreguntas.filter((p) => failIds.has(p.id)),
    [allPreguntas, failIds],
  );
  const favPreguntas = useMemo(() => {
    if (!hydrated) return [];
    return allPreguntas.filter((p) => isFavorito(bancoId, p.id));
  }, [allPreguntas, bancoId, hydrated]);

  const startTest = useCallback(
    (list: PublicExamPregunta[], meta: SessionMeta) => {
      setSession({ list, examMode, meta });
    },
    [examMode],
  );

  if (session) {
    return (
      <>
        <ExamSession
          bancoId={bancoId}
          title={bancoNombre}
          preguntas={session.list}
          examMode={session.examMode}
          timerSeconds={null}
          backHref="/practicar"
          sessionMeta={session.meta}
          onFinish={() => setSession(null)}
        />
      </>
    );
  }

  if (!allPreguntas.length) {
    return (
      <div className="card">
        <p className="muted">Este banco no tiene preguntas todavía.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="test-start-head">
        <h2 className="test-start-title">¿Cómo quieres practicar?</h2>
        <div className="test-start-actions">
          <TestPrintButton
            bancoId={bancoId}
            title={bancoNombre}
            label={`Imprimir banco (${allPreguntas.length})`}
          />
          <Link href={`/admin/bancos/${bancoId}`} className="btn-secondary btn-sm">
            Editar banco
          </Link>
        </div>
      </div>
      <div className="test-mode-list">
        <button
          type="button"
          className="test-mode-btn"
          onClick={() =>
            startTest(allPreguntas, { tipo: "banco", titulo: bancoNombre, bancoId })
          }
        >
          <strong>Todo el banco</strong>
          <span className="muted small">
            {allPreguntas.length} pregunta{allPreguntas.length !== 1 ? "s" : ""} —{" "}
            {bancoNombre}
          </span>
        </button>
        {hydrated && falloPreguntas.length > 0 && (
          <button
            type="button"
            className="test-mode-btn"
            onClick={() =>
              startTest(falloPreguntas, {
                tipo: "fallos",
                titulo: `Fallos — ${bancoNombre}`,
                bancoId,
              })
            }
          >
            <strong>Repaso de fallos</strong>
            <span className="muted small">
              {falloPreguntas.length} pregunta
              {falloPreguntas.length !== 1 ? "s" : ""} que has fallado antes
            </span>
          </button>
        )}
        {hydrated && favPreguntas.length > 0 && (
          <button
            type="button"
            className="test-mode-btn"
            onClick={() =>
              startTest(favPreguntas, {
                tipo: "favoritos",
                titulo: `Favoritas — ${bancoNombre}`,
                bancoId,
              })
            }
          >
            <strong>Test de favoritas</strong>
            <span className="muted small">
              {favPreguntas.length} pregunta{favPreguntas.length !== 1 ? "s" : ""}{" "}
              guardada{favPreguntas.length !== 1 ? "s" : ""}
            </span>
          </button>
        )}
      </div>

      <label className="sim-toggle">
        <input
          type="checkbox"
          checked={examMode}
          onChange={(e) => setExamMode(e.target.checked)}
        />
        <span>
          <strong>Modo examen</strong> — Sin corrección inmediata. Ves los resultados al
          terminar.
        </span>
      </label>
    </div>
  );
}
