"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { ExamSession } from "@/components/ExamSession";
import { getGlobalFalloCount, syncProgressWithServer } from "@/lib/test-progress";

type Props = {
  compact?: boolean;
};

export function RepasoGlobal({ compact }: Props) {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [preguntas, setPreguntas] = useState<PublicExamPregunta[] | null>(null);

  async function refresh() {
    const local = getGlobalFalloCount();
    setCount(local);

    try {
      const res = await fetch("/api/progreso/fallos");
      const data = (await res.json()) as {
        ready?: boolean;
        count?: number;
        preguntas?: PublicExamPregunta[];
      };
      setReady(data.ready ?? false);
      if (data.ready && typeof data.count === "number") {
        setCount(data.count);
      }
    } catch {
      setReady(false);
    }
  }

  useEffect(() => {
    void refresh();
    const onSync = () => void refresh();
    window.addEventListener("opo-progress-synced", onSync);
    return () => window.removeEventListener("opo-progress-synced", onSync);
  }, []);

  async function startRepaso() {
    setLoading(true);
    await syncProgressWithServer();
    const res = await fetch("/api/progreso/fallos");
    const data = (await res.json()) as { preguntas?: PublicExamPregunta[]; ready?: boolean };
    setLoading(false);

    if (!data.ready) {
      alert(
        "La tabla de progreso no está creada. Ve a Material → crea la tabla intentos (botón en admin).",
      );
      return;
    }

    const list = data.preguntas ?? [];
    if (!list.length) {
      alert("No tienes fallos pendientes. ¡Sigue practicando!");
      return;
    }
    setPreguntas(list);
  }

  if (preguntas) {
    return (
      <ExamSession
        bancoId="repaso-global"
        title="Repaso global de fallos"
        preguntas={preguntas}
        examMode={false}
        timerSeconds={null}
        backHref="/repaso"
        sessionMeta={{
          tipo: "repaso",
          titulo: "Repaso global de fallos",
          bancoId: null,
        }}
        onFinish={() => {
          setPreguntas(null);
          void refresh();
        }}
      />
    );
  }

  if (compact) {
    if (count === 0 && ready !== false) return null;
    return (
      <div className="card repaso-banner">
        <div>
          <strong>Repaso global de fallos</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            {count > 0
              ? `${count} pregunta${count !== 1 ? "s" : ""} pendiente${count !== 1 ? "s" : ""} · sincronizado entre dispositivos`
              : ready === false
                ? "Progreso solo en este navegador (falta tabla intentos en Supabase)"
                : "Sin fallos pendientes"}
          </p>
        </div>
        <Link href="/repaso" className="btn-primary btn-sm">
          {count > 0 ? "Repasar" : "Ver repaso"}
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-elevated">
      <h2 className="test-start-title">Repaso global de fallos</h2>
      <p className="muted small">
        Preguntas que has fallado en cualquier banco. El progreso se guarda en Supabase
        para continuar en otro PC.
      </p>

      {ready === false && (
        <p className="info-box sim-info">
          Crea la tabla <strong>intentos</strong> en{" "}
          <Link href="/admin">Material</Link> para sincronizar entre dispositivos. Mientras
          tanto, los fallos se guardan solo en este navegador.
        </p>
      )}

      <p style={{ margin: "1rem 0" }}>
        <span className="result-stat-value" style={{ fontSize: "2rem" }}>
          {count}
        </span>{" "}
        <span className="muted">pregunta{count !== 1 ? "s" : ""} pendiente{count !== 1 ? "s" : ""}</span>
      </p>

      <button
        type="button"
        className="btn-primary"
        disabled={loading || count === 0}
        onClick={() => void startRepaso()}
      >
        {loading ? "Cargando…" : count > 0 ? "Empezar repaso global" : "Sin fallos todavía"}
      </button>

      <p className="muted small" style={{ marginTop: "0.75rem" }}>
        Al acertar en un repaso, la pregunta sale de la lista (aquí y en otros dispositivos).
      </p>
    </div>
  );
}
