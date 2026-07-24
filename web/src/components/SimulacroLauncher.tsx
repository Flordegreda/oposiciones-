"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { PublicExamPregunta, SimulacroPresetId } from "@/lib/exam-utils";
import {
  SIMULACRO_PRESETS,
  estimateSimulacroPick,
  prepareExamSessionQuestions,
  presetSummary,
  simulacroTimerSeconds,
} from "@/lib/exam-utils";
import { ExamSession } from "@/components/ExamSession";
import { SetPageHeader } from "@/components/page-header-context";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { SimulacroMeta } from "@/lib/queries/simulacro";
import { fetchWithRetry } from "@/lib/retry";

type Props = {
  meta: SimulacroMeta;
};

type Running = {
  list: PublicExamPregunta[];
  examMode: boolean;
  timerSeconds: number;
  title: string;
  subtitle: string;
  optionMaps: number[][];
  originalOpciones: string[][];
};

export function SimulacroLauncher({ meta }: Props) {
  const [presetId, setPresetId] = useState<SimulacroPresetId>("oficial");
  const [examMode, setExamMode] = useState(true);
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState<string | null>(null);
  const exitSimulacro = useCallback(() => setRunning(null), []);

  const materias = useMemo(
    () =>
      meta.materias.map((m) => ({
        id: m.id,
        nombre: m.nombre,
      })),
    [meta.materias],
  );

  const pool = useMemo(() => {
    if (!materiaId) return meta.pool;
    const m = meta.materias.find((x) => x.id === materiaId);
    return m ? { teorico: m.teorico, practico: m.practico } : { teorico: 0, practico: 0 };
  }, [meta, materiaId]);

  const materiaLabel = useMemo(() => {
    if (!materiaId) return null;
    return meta.materias.find((m) => m.id === materiaId)?.nombre ?? null;
  }, [materiaId, meta.materias]);

  const presets = useMemo(() => {
    return SIMULACRO_PRESETS.map((p) => {
      const pick = estimateSimulacroPick(pool, p.id);
      const minutes = Math.round(
        simulacroTimerSeconds(p.id, pick.teoricoUsed + pick.practicoUsed) / 60,
      );
      return {
        ...p,
        pick,
        minutes,
        canStart: pick.teoricoUsed + pick.practicoUsed > 0,
      };
    });
  }, [pool]);

  async function iniciarSimulacro() {
    setStarting(true);
    setStartErr(null);
    try {
      const res = await fetchWithRetry(
        "/api/simulacro/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId, materiaId }),
        },
        { retries: 3, baseDelayMs: 400, maxDelayMs: 8_000 },
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(
            "El servicio está temporalmente saturado. Espera unos segundos e inténtalo de nuevo.",
          );
        }
        throw new Error(data.error || "No se pudo iniciar");
      }

      const selected = presets.find((p) => p.id === presetId)!;
      const materiaSuffix = materiaLabel ? ` · ${materiaLabel}` : "";
      const prepared = prepareExamSessionQuestions(data.list as PublicExamPregunta[]);
      setRunning({
        list: prepared.questions,
        examMode,
        timerSeconds: data.timerSeconds as number,
        title: `${selected.label}${materiaSuffix}`,
        subtitle: data.subtitle as string,
        optionMaps: prepared.optionMaps,
        originalOpciones: prepared.originalOpciones,
      });
    } catch (e) {
      setStartErr(e instanceof Error ? e.message : "Error al iniciar");
    } finally {
      setStarting(false);
    }
  }

  if (running) {
    return (
      <>
        <SetPageHeader
          title={running.title}
          backHref="/simulacro"
          backLabel="Simulacro"
        />
        <ExamSession
          title={running.title}
          preguntas={running.list}
          examMode={running.examMode}
          timerSeconds={running.timerSeconds}
          backHref="/simulacro"
          onFinish={exitSimulacro}
          optionMaps={running.optionMaps}
          originalOpciones={running.originalOpciones}
          bancoId="simulacro"
        />
      </>
    );
  }

  const hasPreguntas = meta.pool.teorico + meta.pool.practico > 0;

  if (!hasPreguntas) {
    return (
      <div className="card">
        <p className="muted">
          No hay preguntas cargadas. Importa material en{" "}
          <Link href="/admin">Material</Link>.
        </p>
      </div>
    );
  }

  const selected = presets.find((p) => p.id === presetId)!;

  // Build print URL for current config
  const printUrl = `/imprimir/simulacro?presetId=${presetId}${materiaId ? `&materiaId=${encodeURIComponent(materiaId)}` : ""}`;
  const printTitle = `${selected.label}${materiaLabel ? ` · ${materiaLabel}` : " · Todas las materias"}`;

  return (
    <div className="card card-elevated">
      <h2 className="test-start-title">Configura el simulacro</h2>

      <div className="form-grid-fields carga-campos">
        <label>
          Materia del simulacro
          <select
            value={materiaId ?? ""}
            onChange={(e) => setMateriaId(e.target.value || null)}
          >
            <option value="">Todas las materias</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {materiaId && pool.teorico + pool.practico === 0 && (
        <p className="info-box sim-info">No hay preguntas en esta materia.</p>
      )}

      <p className="muted small">
        Reparto <strong>80 % teórico · 20 % práctico</strong> (como el examen).
        {materiaLabel ? (
          <>
            {" "}
            Materia: <strong>{materiaLabel}</strong> — {pool.teorico} teóricas y{" "}
            {pool.practico} prácticas.
          </>
        ) : (
          <>
            {" "}
            Hay {pool.teorico} teóricas y {pool.practico} prácticas en total.
          </>
        )}{" "}
        Las incorrectas penalizan 0,25 puntos.
      </p>

      {pool.practico === 0 && (
        <p className="info-box sim-info">
          Aún no hay bancos <strong>prácticos</strong> con preguntas. El simulacro usará solo
          teóricas hasta que importes material práctico.
        </p>
      )}

      <div className="sim-options">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`sim-option ${presetId === p.id ? "selected" : ""}`}
            onClick={() => setPresetId(p.id)}
          >
            <span className="sim-option-icon" aria-hidden>
              {p.id === "oficial" ? "📋" : "⚡"}
            </span>
            <span>
              <strong>{p.label}</strong>
              <span className="muted small sim-option-desc">{p.description}</span>
              <span className="muted small sim-option-desc">
                Disponible ahora: {presetSummary(p.id, p.pick)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <label className="sim-toggle">
        <input
          type="checkbox"
          checked={examMode}
          onChange={(e) => setExamMode(e.target.checked)}
        />
        <span>
          <strong>Modo examen real</strong> — Sin corrección inmediata hasta ver el
          resultado, como en el examen oficial.
        </span>
      </label>

      <p className="info-box sim-info">
        El cronómetro arranca al iniciar. Preguntas aleatorias dentro de cada bloque
        (teórico / práctico).
      </p>

      {startErr && <p className="error">{startErr}</p>}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "center" }}>
        <button
          type="button"
          className="btn-primary"
          disabled={!selected.canStart || starting}
          onClick={() => void iniciarSimulacro()}
        >
          {starting
            ? "Preparando simulacro…"
            : `Iniciar · ${presetSummary(presetId, selected.pick)} · ${selected.minutes} min`}
        </button>

        <TestPrintButton
          title={printTitle}
          label="PDF"
          printUrl={printUrl}
          disabled={!selected.canStart}
          className="btn-secondary"
        />
      </div>

      {selected.canStart && (
        <p className="muted small" style={{ marginTop: "0.5rem" }}>
          El botón PDF genera un simulacro aleatorio con las mismas preguntas que el examen para descargar.
        </p>
      )}
    </div>
  );
}
