"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { beginExamSession, clearExamSession } from "@/lib/exam-session-storage";
import { ExamSession } from "@/components/ExamSession";
import { TestPrintButton } from "@/components/TestPrintButton";
import { clearSeguir, rememberSeguir } from "@/lib/study-continue";
import {
  clearTestProgress,
  fingerprintForQuestions,
  loadTestProgress,
  saveTestProgress,
  type TestProgressSnapshot,
} from "@/lib/test-progress-storage";

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
  sessionScope: string;
  initialIndex: number;
  initialAnswers: (number | null)[];
};

export function TestRunner({ bancoId, bancoNombre, preguntas: raw }: Props) {
  const allPreguntas = useMemo(
    () => raw.map((p) => ({ ...p, bancoId })),
    [raw, bancoId],
  );

  const fingerprint = useMemo(
    () => fingerprintForQuestions(allPreguntas.map((p) => p.id)),
    [allPreguntas],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [examMode, setExamMode] = useState(false);
  const [saved, setSaved] = useState<TestProgressSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  const sessionScope = `test:${bancoId}`;

  const startFromPrepared = useCallback(
    (
      list: PublicExamPregunta[],
      optionMaps: number[][],
      originalOpciones: string[][],
      initialIndex: number,
      initialAnswers: (number | null)[],
      mode: boolean,
    ) => {
      setSession({
        list,
        examMode: mode,
        optionMaps,
        originalOpciones,
        sessionScope,
        initialIndex,
        initialAnswers,
      });
    },
    [sessionScope],
  );

  const startFresh = useCallback(
    (list: PublicExamPregunta[]) => {
      clearTestProgress(bancoId);
      clearExamSession(sessionScope);
      setSaved(null);
      const prepared = beginExamSession(sessionScope, list);
      startFromPrepared(
        prepared.questions,
        prepared.optionMaps,
        prepared.originalOpciones,
        0,
        list.map(() => null),
        examMode,
      );
    },
    [bancoId, examMode, sessionScope, startFromPrepared],
  );

  const startSaved = useCallback(
    (snap: TestProgressSnapshot) => {
      const byId = new Map(allPreguntas.map((q) => [q.id, q]));
      const list: PublicExamPregunta[] = [];
      for (const id of snap.questionIds) {
        const q = byId.get(id);
        if (!q) return;
        list.push(q);
      }
      if (list.length !== allPreguntas.length) return;
      const questions = list.map((q, i) => {
        const map = snap.optionMaps[i] ?? q.opciones.map((_, j) => j);
        const originals = snap.originalOpciones[i] ?? [...q.opciones];
        return {
          ...q,
          opciones: map.map((origIdx) => originals[origIdx] ?? q.opciones[origIdx]),
        };
      });
      startFromPrepared(
        questions,
        snap.optionMaps,
        snap.originalOpciones,
        snap.index,
        snap.answers,
        snap.examMode,
      );
    },
    [allPreguntas, startFromPrepared],
  );

  useEffect(() => {
    const snap = loadTestProgress(bancoId);
    const valid = snap && snap.fingerprint === fingerprint ? snap : null;
    setSaved(valid);
    try {
      if (valid && new URLSearchParams(window.location.search).get("seguir") === "1") {
        startSaved(valid);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [bancoId, fingerprint, startSaved]);

  const persistProgress = useCallback(
    (index: number, answers: (number | null)[]) => {
      if (!session) return;
      const answered = answers.filter((a) => a !== null).length;
      const snap: TestProgressSnapshot = {
        v: 1,
        bancoId,
        title: bancoNombre,
        fingerprint,
        questionIds: session.list.map((q) => q.id),
        optionMaps: session.optionMaps,
        originalOpciones: session.originalOpciones,
        index,
        answers,
        examMode: session.examMode,
        updatedAt: Date.now(),
      };
      saveTestProgress(snap);
      rememberSeguir({
        kind: "test",
        id: bancoId,
        title: bancoNombre,
        href: `/test/${bancoId}?seguir=1`,
        hint: `${answered} de ${session.list.length} respondidas`,
      });
    },
    [bancoId, bancoNombre, fingerprint, session],
  );

  const completeSession = useCallback(() => {
    clearExamSession(sessionScope);
    clearTestProgress(bancoId);
    clearSeguir("test", bancoId);
    setSaved(null);
    setSession(null);
  }, [bancoId, sessionScope]);

  if (!ready && !session) {
    return (
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Cargando…
        </p>
      </div>
    );
  }

  if (session) {
    return (
      <ExamSession
        title={bancoNombre}
        preguntas={session.list}
        examMode={session.examMode}
        timerSeconds={null}
        backHref="/practicar"
        onFinish={completeSession}
        onPause={() => {
          setSaved(loadTestProgress(bancoId));
          setSession(null);
        }}
        onProgress={persistProgress}
        initialIndex={session.initialIndex}
        initialAnswers={session.initialAnswers}
        optionMaps={session.optionMaps}
        originalOpciones={session.originalOpciones}
        bancoId={bancoId}
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

  const savedHint = saved
    ? `Pregunta ${saved.index + 1} de ${saved.answers.length}`
    : null;

  return (
    <div className="card">
      <div className="test-start-head">
        <h2 className="test-start-title">¿Cómo quieres practicar?</h2>
        <p className="muted small test-start-lead">
          Elige cuántas preguntas hacer. Las preguntas y las opciones A/B/C/D se barajan en
          cada intento (el orden se mantiene si recargas durante el test). Para estudio con pregunta/respuesta corta, usa{" "}
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
        {saved && (
          <button type="button" className="test-mode-btn" onClick={() => startSaved(saved)}>
            <strong>Continuar</strong>
            <span className="muted small">{savedHint}</span>
          </button>
        )}
        <button type="button" className="test-mode-btn" onClick={() => startFresh(allPreguntas)}>
          <strong>{saved ? "Empezar de nuevo" : "Todo el banco"}</strong>
          <span className="muted small">
            {allPreguntas.length} pregunta{allPreguntas.length !== 1 ? "s" : ""} — {bancoNombre}
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
