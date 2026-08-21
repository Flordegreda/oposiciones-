"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import {
  EvolucionDiariaChart,
  RendimientoBancosChart,
  TiempoMedioBancosChart,
} from "@/components/stats/StatsCharts";
import {
  obtenerDashboardData,
  UMBRAL_BANCO_CRITICO,
  type DashboardData,
  type FiltroTiempo,
  type TestReciente,
} from "@/lib/persistence/estadisticas-service";
import { getLocalCache, getSyncService } from "@/lib/persistence";

const OBJETIVO_DEFAULT = 70;

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTiempo(sec: number | null): string {
  if (sec === null || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function kpiTone(kind: "blue" | "orange" | "red" | "green") {
  switch (kind) {
    case "blue":
      return "border-blue-100 bg-white shadow-sm";
    case "orange":
      return "border-orange-100 bg-white shadow-sm";
    case "red":
      return "border-red-100 bg-white shadow-sm";
    case "green":
      return "border-emerald-100 bg-white shadow-sm";
  }
}

function kpiValueColor(kind: "blue" | "orange" | "red" | "green") {
  switch (kind) {
    case "blue":
      return "text-blue-600";
    case "orange":
      return "text-orange-500";
    case "red":
      return "text-red-500";
    case "green":
      return "text-emerald-600";
  }
}

function progressColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-500";
}

const FILTROS: { id: FiltroTiempo; label: string }[] = [
  { id: "7dias", label: "Últimos 7 días" },
  { id: "30dias", label: "Últimos 30 días" },
  { id: "90dias", label: "Últimos 90 días" },
  { id: "todo", label: "Todo el historial" },
];

export function EstadisticasDashboard() {
  const router = useRouter();
  const { phase, syncNow } = usePersistence();
  const [filtro, setFiltro] = useState<FiltroTiempo>("30dias");
  const [objetivoPct, setObjetivoPct] = useState(OBJETIVO_DEFAULT);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<TestReciente | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dash = await obtenerDashboardData(filtro);
      setData(dash);
      const meta = await getLocalCache().getMeta();
      setLastSync(meta.lastPullAt || meta.lastPushAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void load();
  }, [load]);

  const bancosCriticos = useMemo(
    () =>
      (data?.fallosPorBanco ?? []).filter(
        (b) =>
          b.porcentajeAciertos < UMBRAL_BANCO_CRITICO && b.totalFallidas > 0,
      ),
    [data?.fallosPorBanco],
  );

  async function handleSync() {
    setSyncing(true);
    try {
      await syncNow();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportLocal() {
    setError(null);
    try {
      const resultados = await getLocalCache().getAllResultados();
      const payload = {
        format: "jex-resultados",
        version: 1,
        exportedAt: new Date().toISOString(),
        resultados,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jex-resultados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar el historial");
    }
  }

  async function handlePushAll() {
    setSyncing(true);
    setError(null);
    try {
      const n = await getSyncService().pushAllLocal();
      await syncNow();
      await load();
      if (n === 0) {
        setError("No hay resultados locales para subir.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el historial");
    } finally {
      setSyncing(false);
    }
  }

  const resumen = data?.resumen;
  const aciertosTone = useMemo(() => {
    const v = resumen?.aciertosGlobal ?? 0;
    if (v >= 75) return "green" as const;
    if (v >= 60) return "orange" as const;
    return "red" as const;
  }, [resumen?.aciertosGlobal]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 pb-8 sm:px-0">
      {/* Controles */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium text-slate-700">Periodo</span>
            <select
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroTiempo)}
            >
              {FILTROS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium text-slate-700">Objetivo %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={objetivoPct}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setObjetivoPct(Math.min(100, Math.max(0, n)));
              }}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                phase === "synced"
                  ? "bg-emerald-500"
                  : phase === "syncing" || syncing
                    ? "bg-amber-400"
                    : "bg-slate-300"
              }`}
            />
            {phase === "syncing" || syncing
              ? "Sincronizando…"
              : lastSync
                ? `Sincronizado · ${formatFecha(lastSync)}`
                : "Sin sincronizar aún"}
          </span>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing || phase === "syncing"}
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {syncing ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
          <button
            type="button"
            onClick={() => void handleExportLocal()}
            disabled={syncing || phase === "syncing"}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => void handlePushAll()}
            disabled={syncing || phase === "syncing"}
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
          >
            Subir historial local
          </button>
        </div>
      </div>
      <p className="-mt-4 text-xs text-slate-500">
        «Subir historial local» manda a la nube todos los tests guardados en este navegador.
        «Exportar JSON» sirve para importarlos en la app de escritorio.
      </p>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-slate-500">Cargando estadísticas…</p>
      ) : data && data.totalHistorial === 0 ? (
        <EmptySinHistorial />
      ) : data && data.totalPeriodo === 0 ? (
        <EmptySinPeriodo
          onAmpliar={() => setFiltro("todo")}
          filtroActual={filtro}
        />
      ) : (
        <>
          {data?.recomendacion?.mensaje ? (
            <RecomendacionBanner recomendacion={data.recomendacion} />
          ) : null}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              title="Tests completados"
              value={String(resumen?.testsCompletados ?? 0)}
              tone="blue"
            />
            <KpiCard
              title="Aciertos global"
              value={`${(resumen?.aciertosGlobal ?? 0).toFixed(1)}%`}
              tone={aciertosTone}
            />
            <KpiCard
              title="Tiempo por test"
              value={
                resumen?.tiempoPorTest != null
                  ? formatTiempo(resumen.tiempoPorTest)
                  : "—"
              }
              tone="orange"
            />
            <KpiCard
              title="Racha actual"
              value={`${resumen?.rachaActual ?? 0} día${(resumen?.rachaActual ?? 0) === 1 ? "" : "s"}`}
              tone={(resumen?.rachaActual ?? 0) > 0 ? "green" : "orange"}
            />
          </div>

          {/* Evolución */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">
              Evolución diaria
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Desde tu primer test
              {data?.evolucion[0]?.etiqueta
                ? ` (${data.evolucion[0].etiqueta})`
                : ""}{" "}
              hasta hoy · objetivo {objetivoPct}% · media del periodo
            </p>
            <EvolucionDiariaChart
              data={data?.evolucion ?? []}
              mediaPeriodo={data?.mediaPeriodo}
              objetivoPct={objetivoPct}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bancos */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-1 text-lg font-semibold text-slate-800">
                  Rendimiento por banco
                </h2>
                <p className="mb-4 text-sm text-slate-500">
                  Verde ≥75% · Amarillo 60–74% · Rojo &lt;60%
                </p>
                <RendimientoBancosChart data={data?.rendimientoBancos ?? []} />
                {(data?.rendimientoBancos.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {(data?.rendimientoBancos ?? []).map((b) => (
                      <li
                        key={b.banco}
                        className="flex items-center justify-between gap-2 text-sm text-slate-600"
                      >
                        <span className="truncate font-medium text-slate-700">
                          {b.bancoNombre}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {b.totalTests} test{b.totalTests === 1 ? "" : "s"} ·{" "}
                          {b.porcentaje.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-1 text-lg font-semibold text-slate-800">
                  ⏱️ Tiempo medio por banco
                </h2>
                <p className="mb-4 text-sm text-slate-500">
                  Segundos de media para completar un test de cada banco
                </p>
                <TiempoMedioBancosChart data={data?.tiempoMedioBancos ?? []} />
              </section>
            </div>

            {/* Fallos agregados por banco */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-lg font-semibold text-slate-800">
                    Preguntas más falladas
                  </h2>
                  <p className="text-sm text-slate-500">
                    Por banco · peores primero · periodo seleccionado
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={bancosCriticos.length === 0}
                    onClick={() => {
                      router.push("/repaso-fallos?modo=criticos");
                    }}
                  >
                    ⚠️ Repasar bancos críticos (&lt;{UMBRAL_BANCO_CRITICO}%)
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={(data?.fallosPorBanco.length ?? 0) === 0}
                    onClick={() => {
                      router.push("/repaso-fallos?modo=maraton");
                    }}
                  >
                    🏃 Maratón de fallos
                  </button>
                </div>
              </div>
              {(data?.fallosPorBanco.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">
                  Aún no hay datos por banco con detalle de preguntas. Completa
                  tests nuevos para alimentar esta tabla.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Banco</th>
                        <th className="min-w-[160px] px-3 py-2.5 font-medium">
                          % aciertos
                        </th>
                        <th className="px-3 py-2.5 font-medium">Fallidas</th>
                        <th className="px-3 py-2.5 font-medium">Respondidas</th>
                        <th className="px-3 py-2.5 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.fallosPorBanco ?? []).map((b) => {
                        const critico = b.porcentajeAciertos < UMBRAL_BANCO_CRITICO;
                        return (
                          <tr
                            key={b.banco}
                            className="border-t border-slate-100 align-middle"
                          >
                            <td className="px-3 py-3 font-medium text-slate-800">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{b.bancoNombre}</span>
                                {critico && (
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                    Crítico
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 min-w-[88px] flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${progressColor(b.porcentajeAciertos)}`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, b.porcentajeAciertos))}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`shrink-0 tabular-nums text-xs font-semibold ${
                                    b.porcentajeAciertos >= 75
                                      ? "text-emerald-600"
                                      : b.porcentajeAciertos >= 60
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {b.porcentajeAciertos.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 tabular-nums text-red-600">
                              {b.totalFallidas}
                            </td>
                            <td className="px-3 py-3 tabular-nums text-slate-600">
                              {b.totalRespondidas}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                disabled={b.totalFallidas === 0}
                                onClick={() => {
                                  const q = new URLSearchParams({
                                    modo: "banco",
                                    banco: b.banco,
                                    nombre: b.bancoNombre,
                                  });
                                  router.push(`/repaso-fallos?${q}`);
                                }}
                              >
                                Repasar {b.bancoNombre.length > 18 ? "banco" : b.bancoNombre}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Tabla tests */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="text-lg font-semibold text-slate-800">
                Rendimiento por test
              </h2>
              <p className="text-sm text-slate-500">
                Más recientes primero · pulsa una fila para ver el detalle
              </p>
            </div>
            {(data?.testsRecientes.length ?? 0) === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                Todavía no hay tests guardados. Completa uno en{" "}
                <Link href="/practicar" className="text-blue-600 underline">
                  Tests
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Test</th>
                      <th className="px-4 py-3 font-medium">Aciertos</th>
                      <th className="min-w-[140px] px-4 py-3 font-medium">%</th>
                      <th className="px-4 py-3 font-medium">Tiempo</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.testsRecientes ?? []).map((t) => (
                      <tr
                        key={t.id}
                        className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/40"
                        onClick={() => setDetalle(t)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{t.test}</div>
                          <div className="text-xs text-slate-500">{t.bancoNombre}</div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {t.aciertos}/{t.totalPreguntas}
                        </td>
                        <td className="px-4 py-3">
                          <div className="mb-1 text-xs font-medium text-slate-600">
                            {t.porcentaje.toFixed(0)}%
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${progressColor(t.porcentaje)}`}
                              style={{ width: `${Math.min(100, t.porcentaje)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {formatTiempo(t.tiempoTotal)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {formatFecha(t.fecha)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {detalle && (
        <TestDetalleModal test={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}

function RecomendacionBanner({
  recomendacion,
}: {
  recomendacion: NonNullable<DashboardData["recomendacion"]>;
}) {
  const tone =
    recomendacion.tipo === "mantener"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : recomendacion.tipo === "racha"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-blue-200 bg-blue-50 text-blue-950";

  const href =
    recomendacion.bancoId &&
    recomendacion.bancoId !== "simulacro" &&
    recomendacion.bancoId !== "desconocido"
      ? `/test/${recomendacion.bancoId}`
      : "/practicar";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${tone}`}
      role="status"
    >
      <p className="text-sm font-medium leading-relaxed sm:text-[0.95rem]">
        {recomendacion.mensaje}
      </p>
      {(recomendacion.tipo === "repasar" || recomendacion.tipo === "mantener") && (
        <Link
          href={href}
          className="shrink-0 rounded-xl bg-white/90 px-3 py-2 text-center text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-black/5 transition hover:bg-white"
        >
          Abrir banco
        </Link>
      )}
    </div>
  );
}

function EmptySinHistorial() {
  return (
    <div className="stats-empty flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
      <p
        className="stats-empty-emoji mb-4 text-4xl sm:text-5xl"
        aria-hidden
      >
        🎯
      </p>
      <p className="stats-empty-title max-w-md text-lg font-semibold text-slate-800 sm:text-xl">
        ¡Empieza tu primer test para ver tu progreso!
      </p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Cuando completes un banco o un simulacro, aquí verás KPIs, evolución y
        fallos frecuentes.
      </p>
      <Link
        href="/practicar"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Ir a Tests
      </Link>
    </div>
  );
}

function EmptySinPeriodo({
  onAmpliar,
  filtroActual,
}: {
  onAmpliar: () => void;
  filtroActual: FiltroTiempo;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm sm:py-14">
      <p className="mb-3 text-3xl" aria-hidden>
        📊
      </p>
      <p className="max-w-md text-base font-semibold text-slate-800 sm:text-lg">
        No hay tests en este período. Prueba a ampliar el rango de fechas.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Tienes actividad en el historial, pero ninguna en el filtro actual.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {filtroActual !== "todo" && (
          <button
            type="button"
            onClick={onAmpliar}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Ver todo el historial
          </button>
        )}
        <Link
          href="/practicar"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Hacer un test
        </Link>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "blue" | "orange" | "red" | "green";
}) {
  return (
    <div className={`rounded-2xl border p-4 ${kpiTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${kpiValueColor(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function TestDetalleModal({
  test,
  onClose,
}: {
  test: TestReciente;
  onClose: () => void;
}) {
  const bancoHref =
    test.banco && test.banco !== "simulacro" && test.banco !== "desconocido"
      ? `/test/${test.banco}`
      : "/practicar";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{test.test}</h3>
            <p className="text-sm text-slate-500">{test.bancoNombre}</p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Aciertos</dt>
            <dd className="font-semibold text-slate-800">
              {test.aciertos}/{test.totalPreguntas} ({test.porcentaje.toFixed(0)}%)
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Tiempo</dt>
            <dd className="font-semibold text-slate-800">
              {formatTiempo(test.tiempoTotal)}
            </dd>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Fecha</dt>
            <dd className="font-semibold text-slate-800">{formatFecha(test.fecha)}</dd>
          </div>
        </dl>

        {test.detallePreguntas && test.detallePreguntas.length > 0 && (
          <ul className="mb-4 max-h-56 space-y-2 overflow-auto text-sm">
            {test.detallePreguntas.map((d, i) => (
              <li
                key={d.preguntaId}
                className={`rounded-lg border px-3 py-2 ${
                  !d.respondida
                    ? "border-slate-100 bg-slate-50"
                    : d.correcta
                      ? "border-emerald-100 bg-emerald-50/60"
                      : "border-red-100 bg-red-50/60"
                }`}
              >
                <span className="mr-1 text-xs text-slate-400">{i + 1}.</span>
                {truncate(d.enunciado, 100)}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={bancoHref}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Abrir banco
          </Link>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
