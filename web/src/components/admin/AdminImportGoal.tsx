"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  imported: number;
};

const GOAL_KEY = "opo_jex_import_goal_v1";
const DEFAULT_GOAL = 15000;

export function AdminImportGoal({ imported }: Props) {
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(GOAL_KEY);
    const parsed = Number.parseInt(stored ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setGoal(parsed);
      setGoalInput(String(parsed));
    }
  }, []);

  function saveGoal() {
    const parsed = Number.parseInt(goalInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setGoal(parsed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GOAL_KEY, String(parsed));
    }
  }

  const { pct, remaining } = useMemo(() => {
    const boundedGoal = Math.max(1, goal);
    const progress = Math.min(100, Math.round((imported / boundedGoal) * 100));
    const left = Math.max(0, boundedGoal - imported);
    return { pct: progress, remaining: left };
  }, [goal, imported]);

  return (
    <div className="card import-goal-card">
      <h2>Objetivo de carga</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Controla tu avance de importación total de preguntas.
      </p>

      <div className="import-goal-stats">
        <div>
          <div className="muted small">Importadas</div>
          <strong>{imported.toLocaleString("es-ES")}</strong>
        </div>
        <div>
          <div className="muted small">Objetivo</div>
          <strong>{goal.toLocaleString("es-ES")}</strong>
        </div>
        <div>
          <div className="muted small">Restantes</div>
          <strong>{remaining.toLocaleString("es-ES")}</strong>
        </div>
      </div>

      <div className="import-goal-bar" aria-label="Progreso de importación">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small" style={{ marginTop: "0.45rem" }}>
        {pct}% completado
      </p>

      <div className="import-goal-form">
        <label>
          Objetivo total de preguntas
          <input
            type="number"
            min={1}
            step={100}
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
        </label>
        <button type="button" className="btn-primary btn-sm" onClick={saveGoal}>
          Guardar objetivo
        </button>
      </div>
    </div>
  );
}
