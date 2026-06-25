"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatExamTime } from "@/lib/exam-utils";
import type { ResultadoDetalleItem, ResultadoRow, ResultadoTipo } from "@/lib/queries/resultados";

const TIPO_LABEL: Record<ResultadoTipo, string> = {
  banco: "Test",
  simulacro: "Simulacro",
  repaso: "Repaso global",
  fallos: "Fallos",
  favoritos: "Favoritas",
};

type StatsResponse = {
  ready?: boolean;
  totalSesiones?: number;
  mediaPorcentaje?: number;
  mediaNota?: number;
  recientes?: ResultadoRow[];
  porTipo?: Record<string, number>;
  semanal?: {
    sesiones: number;
    simulacros: number;
    mediaPorcentaje: number;
    minutos: number;
  };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetalleResultado({ detalle }: { detalle: ResultadoDetalleItem[] }) {
  const ok = detalle.filter((d) => d.correcta).length;
  const fail = detalle.filter((d) => !d.correcta && d.respuesta !== null).length;
  const skip = detalle.filter((d) => d.respuesta === null).length;

  return (
    <div className="historial-detalle">
      <p className="muted small">
        {ok} aciertos · {fail} fallos · {skip} sin responder
      </p>
      <ul className="historial-detalle-list">
        {detalle.map((d, i) => {
          const state =
            d.respuesta === null ? "skip" : d.correcta ? "ok" : "fail";
          return (
            <li key={`${d.preguntaId}-${i}`} className={`historial-detalle-item ${state}`}>
              <span className="historial-detalle-num">{i + 1}</span>
              <span className="historial-detalle-text">{d.enunciado}</span>
              {d.dudosa && <span className="result-flag">Dudosa</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HistorialPanel() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [resultados, setResultados] = useState<ResultadoRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch("/api/progreso/stats"),
        fetch("/api/progreso/resultados"),
      ]);
      const statsData = (await statsRes.json()) as StatsResponse;
      const listData = (await listRes.json()) as {
        ready?: boolean;
        resultados?: ResultadoRow[];
      };
      setStats(statsData);
      setResultados(listData.resultados ?? []);
    } catch {
      setStats({ ready: false });
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="muted">Cargando historial…</p>;
  }

  if (!stats?.ready) {
    return (
      <div className="card card-warning">
        <h2>Historial no disponible</h2>
        <p className="muted small">
          Falta crear las tablas en Supabase. Ve a{" "}
          <Link href="/admin">Material</Link> y pulsa «Crear tablas resultados y favoritos».
        </p>
      </div>
    );
  }

  const rows = resultados.length ? resultados : (stats.recientes ?? []);

  return (
    <div className="historial-panel">
      <div className="result-grid historial-stats">
        <div className="result-stat">
          <span className="result-stat-label">Sesiones</span>
          <span className="result-stat-value">{stats.totalSesiones ?? 0}</span>
        </div>
        <div className="result-stat">
          <span className="result-stat-label">Media aciertos</span>
          <span className="result-stat-value ok">{stats.mediaPorcentaje ?? 0}%</span>
        </div>
        <div className="result-stat">
          <span className="result-stat-label">Media nota</span>
          <span className="result-stat-value">{stats.mediaNota ?? 0}</span>
        </div>
      </div>

      {stats.semanal && (
        <div className="card historial-semanal">
          <h2 className="historial-semanal-title">Esta semana</h2>
          <p className="historial-semanal-summary">
            {stats.semanal.sesiones === 0 ? (
              <span className="muted">Sin actividad esta semana.</span>
            ) : (
              <>
                {stats.semanal.simulacros > 0 && (
                  <>
                    <strong>{stats.semanal.simulacros}</strong>{" "}
                    {stats.semanal.simulacros === 1 ? "simulacro" : "simulacros"}
                    {stats.semanal.sesiones > stats.semanal.simulacros && (
                      <>
                        {" "}
                        · <strong>{stats.semanal.sesiones}</strong> sesiones
                      </>
                    )}
                    {" · "}
                  </>
                )}
                {stats.semanal.simulacros === 0 && stats.semanal.sesiones > 0 && (
                  <>
                    <strong>{stats.semanal.sesiones}</strong>{" "}
                    {stats.semanal.sesiones === 1 ? "sesión" : "sesiones"} ·{" "}
                  </>
                )}
                media <strong>{stats.semanal.mediaPorcentaje}%</strong> ·{" "}
                <strong>{stats.semanal.minutos}</strong> min
              </>
            )}
          </p>
        </div>
      )}

      {stats.porTipo && Object.keys(stats.porTipo).length > 0 && (
        <div className="card historial-tipos">
          <p className="muted small" style={{ margin: 0 }}>
            {Object.entries(stats.porTipo)
              .map(([tipo, n]) => `${TIPO_LABEL[tipo as ResultadoTipo] ?? tipo}: ${n}`)
              .join(" · ")}
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">Aún no hay resultados guardados. Termina un test o simulacro.</p>
        </div>
      ) : (
        <div className="card historial-table-wrap">
          <h2 className="test-start-title">Historial</h2>
          <div className="historial-table" role="table">
            <div className="historial-table-head" role="row">
              <span role="columnheader">Fecha</span>
              <span role="columnheader">Tipo</span>
              <span role="columnheader">Sesión</span>
              <span role="columnheader">Aciertos</span>
              <span role="columnheader">Nota</span>
              <span role="columnheader">Tiempo</span>
            </div>
            {rows.map((r) => {
              const open = expandedId === r.id;
              return (
                <div key={r.id} className="historial-table-block">
                  <button
                    type="button"
                    className={`historial-table-row${open ? " open" : ""}`}
                    onClick={() => setExpandedId(open ? null : r.id)}
                    aria-expanded={open}
                  >
                    <span>{fmtDate(r.created_at)}</span>
                    <span className="historial-tipo">{TIPO_LABEL[r.tipo] ?? r.tipo}</span>
                    <span className="historial-titulo">{r.titulo}</span>
                    <span>
                      {r.correctas}/{r.total} ({r.porcentaje}%)
                    </span>
                    <span>{Number(r.nota).toFixed(2)}</span>
                    <span>{r.tiempo_segundos ? formatExamTime(r.tiempo_segundos) : "—"}</span>
                  </button>
                  {open && Array.isArray(r.detalle) && (
                    <DetalleResultado detalle={r.detalle} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
