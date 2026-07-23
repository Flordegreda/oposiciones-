"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";
import {
  formatSyncCodeForDisplay,
  getDispositivoId,
  setDispositivoId,
} from "@/lib/dispositivo-id";
import { ExamSession } from "@/components/ExamSession";

type Counts = { total: number; falladas: number; dudosas: number };

type Session = {
  list: PublicExamPregunta[];
  optionMaps: number[][];
  originalOpciones: string[][];
};

function SyncPanel({
  codigo,
  onLinked,
}: {
  codigo: string;
  onLinked: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("No se pudo copiar. Selecciona el código a mano.");
    }
  }

  function linkOther() {
    setMsg(null);
    setErr(null);
    try {
      const next = setDispositivoId(draft);
      setDraft("");
      setMsg(`Vinculado a ${formatSyncCodeForDisplay(next)}. Misma cola en este navegador.`);
      onLinked();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Código no válido");
    }
  }

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h3 className="admin-preguntas-title" style={{ marginTop: 0 }}>
        Sincronizar entre dispositivos
      </h3>
      <p className="muted small">
        Sin login y sin ralentizar la app: copias este código en el otro móvil/PC y ambos
        comparten la misma cola de falladas.
      </p>
      <p style={{ margin: "0.75rem 0 0.35rem" }}>
        <strong>Tu código:</strong>{" "}
        <code style={{ fontSize: "1.05rem", letterSpacing: "0.04em" }}>{codigo}</code>
      </p>
      <div className="form-actions">
        <button type="button" className="btn-secondary btn-sm" onClick={() => void copyCode()}>
          {copied ? "Copiado" : "Copiar código"}
        </button>
      </div>

      <label style={{ display: "block", marginTop: "1rem" }}>
        ¿Tienes el código de otro dispositivo?
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="JEX-AB12-CD34"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={!draft.trim()}
          onClick={linkOther}
        >
          Usar ese código aquí
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}

export function RepasoFalladas() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts>({ total: 0, falladas: 0, dudosas: 0 });
  const [preguntas, setPreguntas] = useState<PublicExamPregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [codigo, setCodigo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const dispositivoId = getDispositivoId();
      setCodigo(formatSyncCodeForDisplay(dispositivoId));
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

  return (
    <>
      {counts.total === 0 ? (
        <div className="card">
          <h2>Nada pendiente</h2>
          <p className="muted">
            Cuando falles o marques dudas en un test, aparecerán aquí. Se guardan en la base
            de datos con tu código de sincronización (no dependen del historial del
            navegador).
          </p>
          <Link href="/practicar" className="btn-primary">
            Ir a tests
          </Link>
        </div>
      ) : (
        <div className="card card-elevated">
          <h2>Tu cola de repaso</h2>
          <p className="muted">
            {counts.total} pregunta{counts.total !== 1 ? "s" : ""}
            {counts.falladas > 0
              ? ` · ${counts.falladas} fallada${counts.falladas !== 1 ? "s" : ""}`
              : ""}
            {counts.dudosas > 0
              ? ` · ${counts.dudosas} dudosa${counts.dudosas !== 1 ? "s" : ""}`
              : ""}
          </p>
          <p className="muted small">
            Si aciertas en este repaso, salen de la cola. Si fallas, se quedan para otro día.
          </p>
          {err && <p className="error">{err}</p>}
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={start}
              disabled={!preguntas.length}
            >
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
      )}

      {codigo && <SyncPanel codigo={codigo} onLinked={() => void load()} />}
    </>
  );
}
