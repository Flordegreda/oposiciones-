"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";
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
  optionMaps: number[][];
  originalOpciones: string[][];
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
      const prepared = prepareExamSessionQuestions(list);
      setSession({
        list: prepared.questions,
        examMode,
        optionMaps: prepared.optionMaps,
        originalOpciones: prepared.originalOpciones,
      });
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
        optionMaps={session.optionMaps}
        originalOpciones={session.originalOpciones}
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
        <p className="muted small test-start-lead">
          Elige cuántas preguntas hacer. Las opciones A/B/C/D se barajan en cada intento.
          Para repaso con pregunta/respuesta corta, usa{" "}
          <Link href="/fichas">Fichas</Link>.
        </p>
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
