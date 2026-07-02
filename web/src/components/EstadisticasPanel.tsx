"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ResultadoTipo } from "@/lib/queries/resultados";

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
  porTipo?: Record<string, number>;
  semanal?: {
    sesiones: number;
    simulacros: number;
    mediaPorcentaje: number;
    minutos: number;
  };
  desde?: string | null;
};

function fmtBaseline(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function EstadisticasPanel() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/progreso/stats");
      setStats((await res.json()) as StatsResponse);
    } catch {
      setStats({ ready: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="muted">Cargando estadísticas…</p>;
  }

  if (!stats?.ready) {
    return (
      <div className="card card-warning">
        <h2>Estadísticas no disponibles</h2>
        <p className="muted small">
          Falta crear las tablas en Supabase. Ve a{" "}
          <Link href="/admin">Material</Link> y pulsa «Crear tablas resultados y favoritos».
        </p>
      </div>
    );
  }

  return (
    <div className="historial-panel">
      {stats.desde && (
        <p className="muted small" style={{ margin: "0 0 1rem" }}>
          Contando desde el {fmtBaseline(stats.desde)}.
        </p>
      )}

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

      {(stats.totalSesiones ?? 0) === 0 && (
        <div className="card">
          <p className="muted">
            Aún no hay datos. Termina un test o simulacro para empezar a ver tu evolución.
          </p>
        </div>
      )}
    </div>
  );
}
