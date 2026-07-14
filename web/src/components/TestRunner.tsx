"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { ExamSession } from "@/components/ExamSession";
import { TestPrintButton } from "@/components/TestPrintButton";

type Props = {
  bancoId: string;
  bancoNombre: string;
  preguntas: Omit<PublicExamPregunta, "bancoId">[];
};

type Session = {
  list: PublicExamPregunta[];
  examMode: boolean;
};

export function TestRunner({ bancoId, bancoNombre, preguntas: raw }: Props) {
  const allPreguntas = useMemo(
    () => raw.map((p) => ({ ...p, bancoId })),
    [raw, bancoId],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [examMode, setExamMode] = useState(false);

  const startTest = useCallback(
    (list: PublicExamPregunta[]) => {
      setSession({ list, examMode });
    },
    [examMode],
  );

  if (session) {
    return (
      <ExamSession
        bancoId={bancoId}
        title={bancoNombre}
        preguntas={session.list}
        examMode={session.examMode}
        timerSeconds={null}
        backHref="/practicar"
        onFinish={() => setSession(null)}
      />
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
          <Link href={`/admin/bancos/${bancoId}`} className="btn-secondary btn-sm">
            Editar
          </Link>
          <TestPrintButton
            bancoId={bancoId}
            title={bancoNombre}
            label={`PDF (${allPreguntas.length})`}
          />
        </div>
      </div>
      <div className="test-mode-list">
        <button
          type="button"
          className="test-mode-btn"
          onClick={() => startTest(allPreguntas)}
        >
          <strong>Todo el banco</strong>
          <span className="muted small">
            {allPreguntas.length} pregunta{allPreguntas.length !== 1 ? "s" : ""} —{" "}
            {bancoNombre}
          </span>
        </button>
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
