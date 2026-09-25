"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import { FichasEstadisticas } from "@/components/stats/FichasEstadisticas";
import { EvolucionDiariaChart } from "@/components/stats/StatsCharts";
import {
  calcularRendimientoPorMateria,
  filtrarPorFecha,
  getResultadosFromCache,
  obtenerDashboardData,
  UMBRAL_BANCO_CRITICO,
  type DashboardData,
  type FiltroTiempo,
  type TestReciente,
} from "@/lib/persistence/estadisticas-service";
import { examNotaSobre10, formatNotaSobre10, formatNeto } from "@/lib/exam-utils";
import { sugerenciasBloque, sugerenciasGlobales, type Sugerencia } from "@/lib/para-aprobar";
import { getLocalCache, getSyncService } from "@/lib/persistence";
import { getChecklistMarks } from "@/lib/persistence/checklist-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import {
  construirTemarioChecklist,
  type MateriaCatalogo,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";

const OBJETIVO_DEFAULT = 70;
const nf = new Intl.NumberFormat("es-ES");

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

type Tone = "blue" | "orange" | "red" | "green" | "slate";

function kpiTone(kind: Tone) {
  switch (kind) {
    case "blue":
      return "border-blue-100 bg-white shadow-sm";
    case "orange":
      return "border-orange-100 bg-white shadow-sm";
    case "red":
      return "border-red-100 bg-white shadow-sm";
    case "green":
      return "border-emerald-100 bg-white shadow-sm";
    case "slate":
      return "border-slate-200 bg-white shadow-sm";
  }
}

function kpiValueColor(kind: Tone) {
  switch (kind) {
    case "blue":
      return "text-blue-600";
    case "orange":
      return "text-orange-500";
    case "red":
      return "text-red-500";
    case "green":
      return "text-emerald-600";
    case "slate":
      return "text-slate-400";
  }
}

function progressColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function notaTone(v: number | null | undefined): Tone {
  if (v == null) return "slate";
  if (v >= 7) return "green";
  if (v >= 5) return "orange";
  return "red";
}

function notaTextClass(v: number | null | undefined): string {
  if (v == null) return "text-slate-400";
  if (v >= 7) return "text-emerald-600";
  if (v >= 5) return "text-amber-600";
  return "text-red-600";
}

const FILTROS: { id: FiltroTiempo; label: string }[] = [
  { id: "7dias", label: "Últimos 7 días" },
  { id: "30dias", label: "Últimos 30 días" },
  { id: "90dias", label: "Últimos 90 días" },
  { id: "todo", label: "Todo el historial" },
];

type EstadoFiltro = "todo" | "pendiente" | "hecho" | "fallos";
type OrdenBancos = "temario" | "nota" | "pendientes";
type OrdenMaterias = "nombre" | "nota" | "avance";

type FilaBanco = {
  id: string;
  nombre: string;
  tipo?: string;
  preguntas: number | null;
  hecho: boolean;
  abrible: boolean;
  intentos: number;
  porcentaje: number | null;
  nota: number | null;
  tiempo: number | null;
  pendientes: number;
};

type Props = {
  bancoNombres?: Record<string, string>;
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
  bloqueInicial?: string;
};

export function EstadisticasDashboard({
  bancoNombres,
  testSections,
  fichaSections,
  allMaterias,
  bloqueInicial = "",
}: Props) {
  const router = useRouter();
  const bancosVigentes = useMemo(
    () => (bancoNombres ? new Set(Object.keys(bancoNombres)) : undefined),
    [bancoNombres],
  );
  const { phase, revision, syncNow } = usePersistence();
  const [bloque, setBloque] = useState(bloqueInicial);
  const [filtro, setFiltro] = useState<FiltroTiempo>("30dias");
  const [objetivoPct, setObjetivoPct] = useState(OBJETIVO_DEFAULT);
  const [data, setData] = useState<DashboardData | null>(null);
  const [todos, setTodos] = useState<TestResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<TestReciente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFiltro>("todo");
  const [ordenBancos, setOrdenBancos] = useState<OrdenBancos>("temario");
  const [ordenMaterias, setOrdenMaterias] = useState<OrdenMaterias>("nombre");

  const bancoAMateria = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of testSections) for (const b of s.bancos) m.set(b.id, s.id);
    return m;
  }, [testSections]);

  const bloqueIds = useMemo(() => {
    if (!bloque) return undefined;
    const s = testSections.find((x) => x.id === bloque);
    return new Set(s?.bancos.map((b) => b.id) ?? []);
  }, [bloque, testSections]);

  const elegirBloque = useCallback(
    (id: string) => {
      setBloque(id);
      setEstado("todo");
      router.replace(id ? `/estadisticas?bloque=${encodeURIComponent(id)}` : "/estadisticas", {
        scroll: false,
      });
      if (id) window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, rows] = await Promise.all([
        obtenerDashboardData(filtro, bancosVigentes, bancoNombres, bloqueIds),
        getResultadosFromCache(),
      ]);
      setData(dash);
      setTodos(rows);
      const meta = await getLocalCache().getMeta();
      setLastSync(meta.lastPullAt || meta.lastPushAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [filtro, bancosVigentes, bancoNombres, bloqueIds]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  const checklist = useMemo(
    () => construirTemarioChecklist(testSections, fichaSections, todos, getChecklistMarks(), allMaterias),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las marcas manuales cambian con revision
    [testSections, fichaSections, todos, allMaterias, revision],
  );
  const materias = useMemo(() => checklist.materias.filter((m) => m.total > 0), [checklist]);
  const materiaSel = bloque ? checklist.materias.find((m) => m.materiaId === bloque) : undefined;

  const pendientesPorBanco = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of data?.fallosPorBanco ?? []) m.set(b.banco, b.totalFallidas);
    return m;
  }, [data?.fallosPorBanco]);
  const totalPendientes = useMemo(
    () => [...pendientesPorBanco.values()].reduce((s, n) => s + n, 0),
    [pendientesPorBanco],
  );

  const sugerencias: Sugerencia[] = useMemo(() => {
    if (materiaSel) return sugerenciasBloque(materiaSel, pendientesPorBanco);
    return sugerenciasGlobales(checklist.materias, totalPendientes);
  }, [materiaSel, pendientesPorBanco, checklist.materias, totalPendientes]);

  const bancosCriticos = useMemo(
    () =>
      (data?.fallosPorBanco ?? []).filter(
        (b) => b.porcentajeAciertos < UMBRAL_BANCO_CRITICO && b.totalFallidas > 0,
      ),
    [data?.fallosPorBanco],
  );

  const filasBancos = useMemo((): FilaBanco[] => {
    if (!materiaSel || !data) return [];
    const rend = new Map(data.rendimientoBancos.map((b) => [b.banco, b]));
    const tiempos = new Map(data.tiempoMedioBancos.map((t) => [t.banco, t.tiempoMedioSegundos]));
    const filas: FilaBanco[] = materiaSel.items
      .filter((i) => i.kind === "test")
      .map((i) => {
        const r = rend.get(i.id);
        return {
          id: i.id,
          nombre: i.nombre,
          tipo: i.tipo,
          preguntas: i.count,
          hecho: i.hecho,
          abrible: !bancosVigentes || bancosVigentes.has(i.id),
          intentos: r?.totalTests ?? 0,
          porcentaje: r?.porcentaje ?? null,
          nota: r?.notaMedia ?? null,
          tiempo: tiempos.get(i.id) ?? null,
          pendientes: pendientesPorBanco.get(i.id) ?? 0,
        };
      });
    const enCatalogo = new Set(filas.map((f) => f.id));
    for (const r of data.rendimientoBancos) {
      if (enCatalogo.has(r.banco)) continue;
      filas.push({
        id: r.banco,
        nombre: r.bancoNombre,
        preguntas: null,
        hecho: true,
        abrible: false,
        intentos: r.totalTests,
        porcentaje: r.porcentaje,
        nota: r.notaMedia,
        tiempo: tiempos.get(r.banco) ?? null,
        pendientes: pendientesPorBanco.get(r.banco) ?? 0,
      });
    }
    const visibles = filas.filter((f) =>
      estado === "pendiente"
        ? !f.hecho
        : estado === "hecho"
          ? f.hecho
          : estado === "fallos"
            ? f.pendientes > 0
            : true,
    );
    if (ordenBancos === "nota") {
      visibles.sort((a, b) => (a.nota ?? 99) - (b.nota ?? 99));
    } else if (ordenBancos === "pendientes") {
      visibles.sort((a, b) => b.pendientes - a.pendientes);
    }
    return visibles;
  }, [materiaSel, data, bancosVigentes, pendientesPorBanco, estado, ordenBancos]);

  const rendMaterias = useMemo(
    () => (bloque ? null : calcularRendimientoPorMateria(filtrarPorFecha(todos, filtro), bancoAMateria)),
    [bloque, todos, filtro, bancoAMateria],
  );
  const pendientesPorMateria = useMemo(() => {
    const m = new Map<string, number>();
    for (const [banco, n] of pendientesPorBanco) {
      const materia = bancoAMateria.get(banco);
      if (materia) m.set(materia, (m.get(materia) ?? 0) + n);
    }
    return m;
  }, [pendientesPorBanco, bancoAMateria]);

  const filasMaterias = useMemo(() => {
    const visibles = materias.filter((m) =>
      estado === "pendiente"
        ? m.hechos === 0
        : estado === "hecho"
          ? m.hechos > 0
          : estado === "fallos"
            ? (pendientesPorMateria.get(m.materiaId) ?? 0) > 0
            : true,
    );
    if (ordenMaterias === "nota") {
      visibles.sort(
        (a, b) =>
          (rendMaterias?.get(a.materiaId)?.notaMedia ?? 99) -
          (rendMaterias?.get(b.materiaId)?.notaMedia ?? 99),
      );
    } else if (ordenMaterias === "avance") {
      visibles.sort((a, b) => a.pctHecho - b.pctHecho);
    }
    return visibles;
  }, [materias, estado, ordenMaterias, rendMaterias, pendientesPorMateria]);

  const mazosBloque = useMemo(() => {
    const all = fichaSections.flatMap((s) => s.mazos);
    if (!materiaSel) return all;
    const ids = new Set(materiaSel.items.filter((i) => i.kind === "fichas").map((i) => i.id));
    return all.filter((m) => ids.has(m.id));
  }, [fichaSections, materiaSel]);

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

  async function handleVoidResult(id: string) {
    if (
      !window.confirm(
        "¿Anular este intento? Se borrará de las estadísticas y del plan de temario.",
      )
    ) {
      return;
    }
    setVoidingId(id);
    setError(null);
    try {
      await getSyncService().voidResult(id);
      setDetalle(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular el intento");
    } finally {
      setVoidingId(null);
    }
  }

  const resumen = data?.resumen;
  const hayPeriodo = (data?.totalPeriodo ?? 0) > 0;
  const avance = materiaSel ?? checklist;
  const preguntasBloque = (materiaSel ? materiaSel.items : materias.flatMap((m) => m.items))
    .filter((i) => i.kind === "test")
    .reduce((s, i) => s + i.count, 0);
  const nombreBloque = materiaSel?.materiaNombre ?? "todo el temario";
  const periodoLabel = FILTROS.find((f) => f.id === filtro)?.label.toLowerCase() ?? "";
  const aciertosTone: Tone = !hayPeriodo
    ? "slate"
    : (resumen?.aciertosGlobal ?? 0) >= 75
      ? "green"
      : (resumen?.aciertosGlobal ?? 0) >= 60
        ? "orange"
        : "red";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 pb-8 sm:px-0">
      {/* Controles */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-600 sm:min-w-[18rem]">
            <span className="font-medium text-slate-700">Bloque</span>
            <select
              className="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2 font-medium text-slate-900 outline-none focus:border-blue-400"
              value={bloque}
              onChange={(e) => elegirBloque(e.target.value)}
            >
              <option value="">Todos los bloques</option>
              {materias.map((m) => (
                <option key={m.materiaId} value={m.materiaId}>
                  {m.materiaNombre} · {m.pctHecho}% hecho
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
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
            {syncing ? "Sincronizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-slate-500">Cargando estadísticas…</p>
      ) : data && data.totalHistorial === 0 ? (
        <EmptySinHistorial />
      ) : (
        <>
          {materiaSel && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{materiaSel.materiaNombre}</h2>
              <button
                type="button"
                onClick={() => elegirBloque("")}
                className="rounded-lg px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"
              >
                ← Todos los bloques
              </button>
            </div>
          )}

          {/* Avance del temario */}
          <section aria-label="Avance del temario" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Avance · {nombreBloque}
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                title="Temario hecho"
                value={`${avance.pctHecho}%`}
                sub={`${avance.hechos} de ${materiaSel ? materiaSel.total : checklist.totalItems} bancos y mazos`}
                tone={avance.pctHecho >= 75 ? "green" : avance.pctHecho > 0 ? "blue" : "slate"}
                bar={avance.pctHecho}
              />
              <KpiCard
                title="Tests hechos"
                value={`${avance.testsHechos} / ${avance.testsTotal}`}
                sub={`${nf.format(preguntasBloque)} preguntas en total`}
                tone="blue"
              />
              <KpiCard
                title="Fichas repasadas"
                value={`${avance.fichasHechas} / ${avance.fichasTotal}`}
                sub="mazos marcados como hechos"
                tone="blue"
              />
              <KpiCard
                title="Fallos pendientes"
                value={nf.format(totalPendientes)}
                sub="preguntas que fallaste la última vez"
                tone={totalPendientes > 0 ? "red" : "green"}
              />
            </div>
          </section>

          {/* Rendimiento del periodo */}
          <section aria-label="Rendimiento" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rendimiento · {periodoLabel}
            </p>
            {!hayPeriodo ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span>
                  No has hecho preguntas de {nombreBloque} en este periodo.
                </span>
                <div className="flex gap-2">
                  {filtro !== "todo" && (
                    <button
                      type="button"
                      onClick={() => setFiltro("todo")}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver todo el historial
                    </button>
                  )}
                  {sugerencias[0] && (
                    <Link
                      href={sugerencias[0].href}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                    >
                      {sugerencias[0].titulo}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <KpiCard
                  title="Nota media"
                  value={formatNotaSobre10(resumen?.notaMedia)}
                  sub="sobre 10, restando fallos/4"
                  tone={notaTone(resumen?.notaMedia)}
                />
                <KpiCard
                  title="Aciertos"
                  value={`${(resumen?.aciertosGlobal ?? 0).toFixed(1)}%`}
                  sub="sin penalizar"
                  tone={aciertosTone}
                />
                <KpiCard
                  title="Tests"
                  value={String(resumen?.testsCompletados ?? 0)}
                  sub={materiaSel ? "con preguntas del bloque" : "completados"}
                  tone="blue"
                />
                <KpiCard
                  title="Tiempo por test"
                  value={resumen?.tiempoPorTest != null ? formatTiempo(resumen.tiempoPorTest) : "—"}
                  tone="orange"
                />
                <KpiCard
                  title="Racha"
                  value={`${resumen?.rachaActual ?? 0} día${(resumen?.rachaActual ?? 0) === 1 ? "" : "s"}`}
                  sub="estudiando seguido"
                  tone={(resumen?.rachaActual ?? 0) > 0 ? "green" : "orange"}
                />
              </div>
            )}
          </section>

          {/* Siguiente paso */}
          {sugerencias.length > 0 && (
            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
                {materiaSel ? `Siguiente en ${materiaSel.materiaNombre}` : "Para aprobar"}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {sugerencias.map((s) => (
                  <Link
                    key={s.href + s.titulo}
                    href={s.href}
                    className="flex flex-col gap-0.5 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 no-underline transition hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <span className="text-sm font-semibold">{s.titulo}</span>
                    <span className="text-xs text-slate-500">{s.detalle}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tabla principal: materias o bancos del bloque */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {materiaSel ? "Bancos del bloque" : "Bloques"}
                </h2>
                <p className="text-sm text-slate-500">
                  {materiaSel
                    ? `Nota, aciertos y tiempo: ${periodoLabel} · pendientes: fallos sin acertar todavía`
                    : `Pulsa un bloque para ver su detalle · nota y aciertos: ${periodoLabel}`}
                </p>
              </div>
              {!materiaSel && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={bancosCriticos.length === 0}
                    onClick={() => router.push("/repaso-fallos?modo=criticos")}
                  >
                    ⚠️ Repasar bancos críticos (&lt;{UMBRAL_BANCO_CRITICO}%)
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={totalPendientes === 0}
                    onClick={() => router.push("/repaso-fallos?modo=maraton")}
                  >
                    🏃 Maratón de fallos
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
                {(
                  [
                    ["todo", "Todos"],
                    ["hecho", materiaSel ? "Hechos" : "Empezados"],
                    ["pendiente", "Sin empezar"],
                    ["fallos", "Con fallos"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={estado === id}
                    onClick={() => setEstado(id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      estado === id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Ordenar
                {materiaSel ? (
                  <select
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700"
                    value={ordenBancos}
                    onChange={(e) => setOrdenBancos(e.target.value as OrdenBancos)}
                  >
                    <option value="temario">Orden del temario</option>
                    <option value="nota">Peor nota primero</option>
                    <option value="pendientes">Más fallos pendientes</option>
                  </select>
                ) : (
                  <select
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700"
                    value={ordenMaterias}
                    onChange={(e) => setOrdenMaterias(e.target.value as OrdenMaterias)}
                  >
                    <option value="nombre">Alfabético</option>
                    <option value="nota">Peor nota primero</option>
                    <option value="avance">Menos avance primero</option>
                  </select>
                )}
              </label>
            </div>

            {materiaSel ? (
              <TablaBancos filas={filasBancos} />
            ) : (
              <TablaMaterias
                filas={filasMaterias}
                rend={rendMaterias}
                pendientes={pendientesPorMateria}
                onElegir={elegirBloque}
              />
            )}
          </section>

          {/* Evolución */}
          {hayPeriodo && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-lg font-semibold text-slate-800">Evolución diaria</h2>
                  <p className="text-sm text-slate-500">
                    % de aciertos por día
                    {materiaSel ? ` en ${materiaSel.materiaNombre}` : ""} · línea: media del periodo
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Objetivo
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={objetivoPct}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) setObjetivoPct(Math.min(100, Math.max(0, n)));
                    }}
                    className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-800 outline-none focus:border-blue-400"
                  />
                  %
                </label>
              </div>
              <EvolucionDiariaChart
                data={data?.evolucion ?? []}
                mediaPeriodo={data?.mediaPeriodo}
                objetivoPct={objetivoPct}
              />
            </section>
          )}

          {/* Tabla tests */}
          {hayPeriodo && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <h2 className="text-lg font-semibold text-slate-800">
                  Tus tests{materiaSel ? ` con preguntas de ${materiaSel.materiaNombre}` : ""}
                </h2>
                <p className="text-sm text-slate-500">
                  Más recientes primero · pulsa una fila para ver el detalle · la neta penaliza
                  incorrectas (−1/4)
                  {materiaSel ? " · en simulacros solo cuentan las preguntas de este bloque" : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Test</th>
                      <th className="px-4 py-3 font-medium">Aciertos</th>
                      <th className="px-4 py-3 font-medium">Fallos</th>
                      <th className="px-4 py-3 font-medium">Neta /10</th>
                      <th className="min-w-[140px] px-4 py-3 font-medium">% bruto</th>
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
                        <td className="px-4 py-3 tabular-nums text-slate-700">{t.fallos}</td>
                        <td className="px-4 py-3 tabular-nums font-medium text-slate-800">
                          {formatNotaSobre10(examNotaSobre10(t.aciertos, t.fallos, t.totalPreguntas))}
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
            </section>
          )}
        </>
      )}

      <FichasEstadisticas key={bloque || "todos"} mazos={mazosBloque} />

      {/* Informes y copias */}
      <details className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Informes, impresión y copias
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/imprimir/resultados?periodo=${filtro}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Imprimir informe de tests
          </a>
          <a
            href="/imprimir/temario/resultados"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Notas por materia (PDF)
          </a>
          <a
            href="/imprimir/temario"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Imprimir inventario del temario
          </a>
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
        <p className="mt-2 text-xs text-slate-500">
          «Subir historial local» manda a la nube todos los tests guardados en este navegador.
          «Exportar JSON» sirve para importarlos en la app de escritorio.
        </p>
      </details>

      {detalle && (
        <TestDetalleModal
          test={detalle}
          voiding={voidingId === detalle.id}
          onClose={() => setDetalle(null)}
          onVoid={handleVoidResult}
        />
      )}
    </div>
  );
}

function BarraPct({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-[64px] flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressColor(pct)}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function TablaBancos({ filas }: { filas: FilaBanco[] }) {
  const router = useRouter();
  if (!filas.length) {
    return <p className="px-5 pb-5 text-sm text-slate-500">Ningún banco con este filtro.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Banco</th>
            <th className="px-3 py-2.5 font-medium">Intentos</th>
            <th className="min-w-[130px] px-3 py-2.5 font-medium">% aciertos</th>
            <th className="px-3 py-2.5 font-medium">Nota</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Tiempo medio</th>
            <th className="px-3 py-2.5 font-medium">Pendientes</th>
            <th className="px-3 py-2.5 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-t border-slate-100 align-middle">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-800">
                  {f.abrible ? (
                    <Link
                      href={`/test/${f.id}`}
                      className="text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-[var(--primary)] hover:decoration-current"
                      title="Abrir el test"
                    >
                      {f.nombre}
                    </Link>
                  ) : (
                    <span>{f.nombre}</span>
                  )}
                  {!f.hecho && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Sin empezar
                    </span>
                  )}
                  {f.porcentaje !== null && f.porcentaje < UMBRAL_BANCO_CRITICO && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      Crítico
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {[f.tipo, f.preguntas !== null ? `${nf.format(f.preguntas)} preguntas` : "simulacros y repasos"]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-600">{f.intentos || "—"}</td>
              <td className="px-3 py-3">
                <BarraPct pct={f.porcentaje} />
              </td>
              <td className={`px-3 py-3 font-semibold tabular-nums ${notaTextClass(f.nota)}`}>
                {f.nota !== null ? formatNotaSobre10(f.nota) : "—"}
              </td>
              <td className="hidden px-3 py-3 tabular-nums text-slate-600 md:table-cell">
                {formatTiempo(f.tiempo)}
              </td>
              <td className={`px-3 py-3 tabular-nums ${f.pendientes ? "font-semibold text-red-600" : "text-slate-400"}`}>
                {f.pendientes || "—"}
              </td>
              <td className="px-3 py-3">
                {f.pendientes > 0 ? (
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                    onClick={() => {
                      const q = new URLSearchParams({ modo: "banco", banco: f.id, nombre: f.nombre });
                      router.push(`/repaso-fallos?${q}`);
                    }}
                  >
                    Repasar fallos
                  </button>
                ) : f.abrible ? (
                  <Link
                    href={`/test/${f.id}`}
                    className="whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white no-underline transition hover:bg-blue-700"
                  >
                    {f.hecho ? "Repetir" : "Empezar"}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaMaterias({
  filas,
  rend,
  pendientes,
  onElegir,
}: {
  filas: TemarioMateriaResumen[];
  rend: ReturnType<typeof calcularRendimientoPorMateria> | null;
  pendientes: Map<string, number>;
  onElegir: (id: string) => void;
}) {
  if (!filas.length) {
    return <p className="px-5 pb-5 text-sm text-slate-500">Ningún bloque con este filtro.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Bloque</th>
            <th className="min-w-[130px] px-3 py-2.5 font-medium">Avance</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Tests</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Fichas</th>
            <th className="min-w-[110px] px-3 py-2.5 font-medium">% aciertos</th>
            <th className="px-3 py-2.5 font-medium">Nota</th>
            <th className="px-3 py-2.5 font-medium">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((m) => {
            const r = rend?.get(m.materiaId);
            const pend = pendientes.get(m.materiaId) ?? 0;
            return (
              <tr
                key={m.materiaId}
                className="cursor-pointer border-t border-slate-100 align-middle transition hover:bg-blue-50/40"
                onClick={() => onElegir(m.materiaId)}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-[var(--primary)]"
                  >
                    {m.materiaNombre}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-[64px] flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${m.pctHecho}%` }} />
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
                      {m.pctHecho}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 tabular-nums text-slate-600 sm:table-cell">
                  {m.testsTotal ? `${m.testsHechos}/${m.testsTotal}` : "—"}
                </td>
                <td className="hidden px-3 py-3 tabular-nums text-slate-600 sm:table-cell">
                  {m.fichasTotal ? `${m.fichasHechas}/${m.fichasTotal}` : "—"}
                </td>
                <td className="px-3 py-3">
                  <BarraPct pct={r?.porcentaje ?? null} />
                </td>
                <td className={`px-3 py-3 font-semibold tabular-nums ${notaTextClass(r?.notaMedia)}`}>
                  {r ? formatNotaSobre10(r.notaMedia) : "—"}
                </td>
                <td className={`px-3 py-3 tabular-nums ${pend ? "font-semibold text-red-600" : "text-slate-400"}`}>
                  {pend || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptySinHistorial() {
  return (
    <div className="stats-empty flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
      <p className="stats-empty-emoji mb-4 text-4xl sm:text-5xl" aria-hidden>
        🎯
      </p>
      <p className="stats-empty-title max-w-md text-lg font-semibold text-slate-800 sm:text-xl">
        ¡Empieza tu primer test para ver tu progreso!
      </p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Cuando completes un banco o un simulacro, aquí verás tu avance por bloques, notas y
        fallos pendientes.
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

function KpiCard({
  title,
  value,
  sub,
  tone,
  bar,
}: {
  title: string;
  value: string;
  sub?: string;
  tone: Tone;
  bar?: number;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${kpiTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${kpiValueColor(tone)}`}>
        {value}
      </p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function TestDetalleModal({
  test,
  onClose,
  onVoid,
  voiding,
}: {
  test: TestReciente;
  onClose: () => void;
  onVoid?: (id: string) => Promise<void> | void;
  voiding?: boolean;
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
            <dt className="text-xs text-slate-500">Nota neta</dt>
            <dd className="font-semibold text-slate-800">
              {formatNotaSobre10(examNotaSobre10(test.aciertos, test.fallos, test.totalPreguntas))}
              /10 · neto {formatNeto(test.aciertos, test.fallos)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Aciertos / fallos</dt>
            <dd className="font-semibold text-slate-800">
              {test.aciertos} aciertos · {test.fallos} fallos ·{" "}
              {Math.max(0, test.totalPreguntas - test.aciertos - test.fallos)} en blanco
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Acierto bruto</dt>
            <dd className="font-semibold text-slate-800">
              {test.aciertos}/{test.totalPreguntas} ({test.porcentaje.toFixed(0)}%)
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Tiempo</dt>
            <dd className="font-semibold text-slate-800">{formatTiempo(test.tiempoTotal)}</dd>
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
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            disabled={voiding}
            onClick={() => void onVoid?.(test.id)}
          >
            {voiding ? "Anulando…" : "Anular intento"}
          </button>
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
