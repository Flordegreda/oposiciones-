"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";
import { getDispositivoId } from "@/lib/dispositivo-id";
import { ExamSession } from "@/components/ExamSession";

type Counts = { total: number; falladas: number; dudosas: number };

type Session = {
  list: PublicExamPregunta[];
  optionMaps: number[][];
  originalOpciones: string[][];
};

export function RepasoFalladas() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts>({ total: 0, falladas: 0, dudosas: 0 });
  const [preguntas, setPreguntas] = useState<PublicExamPregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const dispositivoId = getDispositivoId();
      const res = await fetch(
        `/api/repaso/falladas?dispositivoId=${encodeURIComponent(dispositivoId)}&preguntas=1`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la cola");
      setReady(data.ready !== false);
      setCounts(data.counts ?? { total: 0, falladas: 0, dudosas: 0 });
      setPreguntas(Array.isArray(data.preguntas) ? data.preguntas : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function start() {
    if (!preguntas.length) return;
    const prepared = prepareExamSessionQuestions(preguntas);
    setSession({
      list: prepared.questions,
      optionMaps: prepared.optionMaps,
      originalOpciones: prepared.originalOpciones,
    });
  }

  if (session) {
    return (
      <ExamSession
        bancoId="repaso"
        title="Repaso de falladas"
        preguntas={session.list}
        examMode={false}
        timerSeconds={null}
        backHref="/repaso"
        onFinish={() => {
          setSession(null);
          void load();
        }}
        optionMaps={session.optionMaps}
        originalOpciones={session.originalOpciones}
        repasoMode
      />
    );
  }

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Cargando cola de repaso…</p>
      </div>
    );
  }

  if (ready === false) {
    return (
      <div className="card card-warning">
        <h2>Cola de falladas</h2>
        <p className="muted">
          Aún no está activada. En{" "}
          <Link href="/admin">Material</Link> pulsa{" "}
          <strong>Activar cola de falladas</strong> (tarjeta amarilla).
        </p>
        {err && <p className="error">{err}</p>}
      </div>
    );
  }

  if (!counts.total) {
    return (
      <div className="card">
        <h2>Nada pendiente</h2>
        <p className="muted">
          Cuando falles o marques dudas en un test, aparecerán aquí para repasarlas más
          adelante (aunque limpies el historial del navegador, se guardan en la base de
          datos ligadas a este dispositivo).
        </p>
        <Link href="/practicar" className="btn-primary">
          Ir a tests
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-elevated">
      <h2>Tu cola de repaso</h2>
      <p className="muted">
        {counts.total} pregunta{counts.total !== 1 ? "s" : ""}
        {counts.falladas > 0 ? ` · ${counts.falladas} fallada${counts.falladas !== 1 ? "s" : ""}` : ""}
        {counts.dudosas > 0 ? ` · ${counts.dudosas} dudosa${counts.dudosas !== 1 ? "s" : ""}` : ""}
      </p>
      <p className="muted small">
        Si aciertas en este repaso, salen de la cola. Si fallas, se quedan para otro día.
      </p>
      {err && <p className="error">{err}</p>}
      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={start} disabled={!preguntas.length}>
          Repasar ahora ({preguntas.length})
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
        <Link href="/practicar" className="btn-link btn-sm">
          Volver a tests
        </Link>
      </div>
    </div>
  );
}
