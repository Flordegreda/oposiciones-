"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { examScore, formatExamTime } from "@/lib/exam-utils";
import { TestPrintButton, type PrintablePregunta } from "@/components/TestPrintButton";

type AnswerMeta = {
  respuesta: number;
  explicacion?: string;
};

type Props = {
  bancoId: string;
  title: string;
  preguntas: PublicExamPregunta[];
  examMode: boolean;
  timerSeconds: number | null;
  backHref: string;
  onFinish?: () => void;
  fichaHref?: string | null;
  fichaLabel?: string | null;
};

type Phase = "test" | "result";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function emptyAnswers(n: number): (number | null)[] {
  return Array.from({ length: n }, () => null);
}

function emptyFlags(n: number): boolean[] {
  return Array.from({ length: n }, () => false);
}

export function ExamSession({
  title,
  preguntas: active,
  examMode,
  timerSeconds,
  backHref,
  onFinish,
  fichaHref,
  fichaLabel,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const timerIdRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("test");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    emptyAnswers(active.length),
  );
  const [flags, setFlags] = useState<boolean[]>(() => emptyFlags(active.length));
  const [answerMeta, setAnswerMeta] = useState<Map<string, AnswerMeta>>(() => new Map());
  const [remaining, setRemaining] = useState<number | null>(timerSeconds);
  const [timerEnded, setTimerEnded] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    setRemaining(timerSeconds);
  }, [timerSeconds]);

  const total = active.length;
  const current = active[index];
  const picked = answers[index] ?? null;
  const answered = answers.filter((a) => a !== null).length;
  const okCount = answers.filter((a, i) => {
    if (a === null) return false;
    const meta = answerMeta.get(active[i]?.id ?? "");
    return meta !== undefined && a === meta.respuesta;
  }).length;
  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;
  const showCorrection = !examMode || phase === "result";
  const currentMeta = current ? answerMeta.get(current.id) : undefined;

  const printable = useMemo<PrintablePregunta[]>(
    () =>
      active.map((q) => {
        const meta = answerMeta.get(q.id);
        return {
          enunciado: q.enunciado,
          opciones: q.opciones,
          respuesta: meta?.respuesta ?? 0,
          explicacion: meta?.explicacion,
          supuestoId: q.supuestoId,
          supuestoTitulo: q.supuestoTitulo,
          supuestoTexto: q.supuestoTexto,
        };
      }),
    [active, answerMeta],
  );
  const canPrintWithKey = phase === "result" && answerMeta.size > 0;

  const finishTest = useCallback(async () => {
    if (examMode) {
      setGrading(true);
      try {
        const res = await fetch("/api/exam/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: active.map((q, i) => ({ id: q.id, selected: answers[i] })),
          }),
        });
        const data = (await res.json()) as {
          results?: {
            id: string;
            respuesta: number;
            explicacion?: string;
          }[];
        };
        if (res.ok && Array.isArray(data.results)) {
          const meta = new Map<string, AnswerMeta>();
          for (const r of data.results) {
            meta.set(r.id, { respuesta: r.respuesta, explicacion: r.explicacion });
          }
          setAnswerMeta(meta);
        }
      } finally {
        setGrading(false);
      }
    }
    setPhase("result");
  }, [examMode, active, answers]);

  const stopTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setRemaining(null);
  }, []);

  const exitSession = useCallback(() => {
    if (phase === "test") {
      const msg =
        timerSeconds !== null
          ? "¿Abandonar el simulacro? El cronómetro se detendrá."
          : answered > 0
            ? "¿Salir del test? Perderás el progreso actual."
            : null;
      if (msg && !window.confirm(msg)) return;
    }

    stopTimer();
    onFinish?.();
    if (pathname !== backHref) router.push(backHref);
  }, [
    phase,
    timerSeconds,
    answered,
    stopTimer,
    onFinish,
    pathname,
    backHref,
    router,
  ]);

  useEffect(() => {
    if (phase !== "test" || timerSeconds === null) return;
    const deadline = Date.now() + timerSeconds * 1000;
    setRemaining(timerSeconds);

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setTimerEnded(true);
        void finishTest();
      }
    };

    tick();
    timerIdRef.current = window.setInterval(tick, 250);
    return () => {
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [phase, timerSeconds, finishTest]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return;
      setIndex(i);
    },
    [total],
  );

  const selectOption = useCallback(
    (optionIndex: number) => {
      if (!current) return;
      if (!examMode && picked !== null) return;

      setAnswers((prev) => {
        const next = [...prev];
        next[index] = optionIndex;
        return next;
      });

      if (examMode) return;

      void fetch("/api/exam/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, selected: optionIndex }),
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            correct?: boolean;
            respuesta?: number;
            explicacion?: string;
          };
          if (!res.ok || typeof data.respuesta !== "number") return;

          setAnswerMeta((prev) =>
            new Map(prev).set(current.id, {
              respuesta: data.respuesta!,
              explicacion: data.explicacion,
            }),
          );
        })
        .catch(() => {});
    },
    [current, index, picked, examMode],
  );

  const toggleFlag = useCallback(() => {
    setFlags((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, [index]);

  const flagged = flags[index] ?? false;
  const dudosaCount = flags.filter(Boolean).length;

  if (phase === "result") {
    const failCount = answered - okCount;
    const skipCount = total - answered;
    const pct = answered > 0 ? Math.round((okCount / answered) * 100) : 0;
    const nota = examScore(okCount, failCount);

    return (
      <div className="card result-panel">
        <h2>Resultado{examMode ? " — modo examen" : ""}</h2>
        {timerEnded && (
          <p className="muted small">Tiempo agotado. Se han guardado tus respuestas.</p>
        )}
        <p
          className="result-score"
          style={{ color: pct >= 60 ? "var(--success)" : "var(--danger)" }}
        >
          {pct}%
        </p>
        <p className="muted">
          {okCount} correctas · {failCount} incorrectas · {skipCount} sin responder · Nota:{" "}
          {nota} / {total}
        </p>

        {dudosaCount > 0 && !examMode && (
          <div className="result-dudosas">
            <span>
              {dudosaCount} pregunta{dudosaCount !== 1 ? "s" : ""} marcada
              {dudosaCount !== 1 ? "s" : ""} como dudosa{dudosaCount !== 1 ? "s" : ""}.
            </span>
          </div>
        )}

        <div className="result-grid">
          <div className="result-stat">
            <span className="result-stat-label">Correctas</span>
            <span className="result-stat-value ok">{okCount}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">Incorrectas</span>
            <span className="result-stat-value fail">{failCount}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">Sin responder</span>
            <span className="result-stat-value">{skipCount}</span>
          </div>
        </div>

        <div className="result-breakdown">
          <p className="test-meta">Detalle</p>
          <ul className="result-breakdown-list">
            {active.map((q, i) => {
              const ans = answers[i];
              const meta = answerMeta.get(q.id);
              const isOk =
                ans !== null && meta !== undefined && ans === meta.respuesta;
              let icon = "—";
              if (ans !== null) icon = isOk ? "✓" : "✗";
              return (
                <li
                  key={q.id}
                  className={`result-breakdown-item ${isOk ? "ok" : ans !== null ? "fail" : ""}`}
                >
                  <span className="result-breakdown-icon" aria-hidden>
                    {icon}
                  </span>
                  <span className="result-breakdown-num">{i + 1}.</span>
                  <div className="result-breakdown-body">
                    <span className="result-breakdown-text">
                      {flags[i] && (
                        <span className="result-flag" title="Dudosa">
                          ⚑{" "}
                        </span>
                      )}
                      {q.enunciado}
                    </span>
                    {ans !== null && !isOk && meta !== undefined && (
                      <span className="result-breakdown-fix">
                        ✓ {q.opciones[meta.respuesta]}
                      </span>
                    )}
                    {examMode && meta?.explicacion && (
                      <p className="explain explain--compact">{meta.explicacion}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="test-actions test-actions--result">
          {canPrintWithKey && (
            <TestPrintButton title={title} preguntas={printable} />
          )}
          {fichaHref && (
            <Link href={fichaHref} className="btn-secondary">
              {fichaLabel ?? "Repasar ficha"}
            </Link>
          )}
          <button type="button" className="btn-primary" onClick={() => onFinish?.()}>
            {onFinish ? "Volver" : "Repetir"}
          </button>
          <button type="button" className="btn-link" onClick={exitSession}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="card test-card">
      <div className="test-header-bar">
        <div>
          <p className="test-meta" style={{ margin: 0 }}>
            Pregunta {index + 1} de {total}
          </p>
          {examMode && phase === "test" && (
            <span className="test-mode-badge">Modo examen</span>
          )}
        </div>
        <div className="test-header-actions">
          {canPrintWithKey && (
            <TestPrintButton title={title} preguntas={printable} />
          )}
          {timerSeconds !== null && remaining !== null && (
            <span
              className={`test-timer ${remaining <= 300 ? "warning" : ""}`}
              aria-live="polite"
            >
              ⏱ {formatExamTime(remaining)}
            </span>
          )}
          <button type="button" className="btn-link btn-sm" onClick={exitSession}>
            Salir
          </button>
        </div>
      </div>

      {grading && (
        <p className="muted small" aria-live="polite">
          Corrigiendo examen…
        </p>
      )}

      <div className="test-progress" aria-hidden>
        <div className="test-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="qmap" role="navigation" aria-label="Mapa de preguntas">
        {active.map((q, i) => {
          const meta = answerMeta.get(q.id);
          let cls = "qmap-btn";
          if (i === index) cls += " current";
          else if (answers[i] !== null) {
            if (examMode || meta === undefined) cls += " answered-any";
            else cls += answers[i] === meta.respuesta ? " answered-ok" : " answered-fail";
          }
          if (flags[i]) cls += " flagged";
          return (
            <button
              key={q.id}
              type="button"
              className={cls}
              aria-label={`Pregunta ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {current.supuestoTexto && (
        <div className="supuesto-panel">
          {current.supuestoTitulo && (
            <p className="supuesto-panel-title">{current.supuestoTitulo}</p>
          )}
          <div className="supuesto-panel-text">{current.supuestoTexto}</div>
        </div>
      )}

      <p className="test-question">{current.enunciado}</p>
      <ul className="options">
        {current.opciones.map((opt, i) => {
          let cls = "option-btn";
          if (picked !== null) {
            if (examMode) {
              if (i === picked) cls += " selected-exam";
            } else if (currentMeta !== undefined) {
              if (i === currentMeta.respuesta) cls += " correct";
              else if (i === picked) cls += " wrong";
            }
          }
          return (
            <li key={i}>
              <button
                type="button"
                className={cls}
                disabled={!examMode && picked !== null}
                onClick={() => selectOption(i)}
              >
                <span className="option-letter">{LETTERS[i]}</span>
                <span className="option-text">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {showCorrection && picked !== null && currentMeta?.explicacion && (
        <p className="explain">{currentMeta.explicacion}</p>
      )}

      <div className="test-actions test-actions--bar">
        <div className="test-actions-left">
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
            className={`btn-icon btn-flag ${flagged ? "active" : ""}`}
            title="Marcar como dudosa"
            aria-pressed={flagged}
            onClick={toggleFlag}
          >
            ⚑
          </button>
        </div>
        <div className="test-actions-right">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={grading}
            onClick={() => {
              const pending = total - answered;
              if (
                pending > 0 &&
                !confirm(`Quedan ${pending} sin responder. ¿Terminar igualmente?`)
              ) {
                return;
              }
              void finishTest();
            }}
          >
            Terminar
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={grading}
            onClick={() => {
              if (index + 1 >= total) void finishTest();
              else goTo(index + 1);
            }}
          >
            {index + 1 >= total ? "Ver resultado" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}
