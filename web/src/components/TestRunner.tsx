"use client";

import { useMemo, useState } from "react";

type Pregunta = {
  id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string;
};

type Props = {
  bancoId: string;
  bancoNombre: string;
  preguntas: Pregunta[];
};

export function TestRunner({ bancoNombre, preguntas }: Props) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const total = preguntas.length;
  const current = preguntas[index];
  const progress = total ? Math.round(((index + (picked !== null ? 1 : 0)) / total) * 100) : 0;

  const letters = useMemo(() => ["A", "B", "C", "D", "E", "F"], []);

  if (!total) {
    return (
      <div className="card">
        <p className="muted">Este banco no tiene preguntas todavía.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>¿Cómo quieres practicar?</h2>
        <button
          type="button"
          className="test-mode-btn active"
          onClick={() => setStarted(true)}
        >
          <strong>Todo el banco</strong>
          <span className="muted small">
            {total} pregunta{total !== 1 ? "s" : ""} — {bancoNombre}
          </span>
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card result-panel">
        <h2>Resultado</h2>
        <p className="result-score">
          {correct}/{total}
        </p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Repetir
        </button>
      </div>
    );
  }

  return (
    <div className="card test-card">
      <div className="test-progress" aria-hidden>
        <div className="test-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="test-meta">
        Pregunta {index + 1} de {total}
      </p>
      <p className="test-question">{current.enunciado}</p>
      <ul className="options">
        {current.opciones.map((opt, i) => {
          let cls = "option-btn";
          if (picked !== null) {
            if (i === current.respuesta) cls += " correct";
            else if (i === picked) cls += " wrong";
          }
          return (
            <li key={i}>
              <button
                type="button"
                className={cls}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(i);
                  if (i === current.respuesta) setCorrect((c) => c + 1);
                }}
              >
                {letters[i]}) {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && current.explicacion && (
        <p className="explain">{current.explicacion}</p>
      )}
      <div className="test-actions">
        <button
          type="button"
          className="btn-primary btn-next"
          disabled={picked === null}
          onClick={() => {
            if (index + 1 >= total) setDone(true);
            else {
              setIndex((x) => x + 1);
              setPicked(null);
            }
          }}
        >
          {index + 1 >= total ? "Ver resultado" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
