"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import { Anillo } from "@/components/stats/Anillo";
import { FichasEstadisticas } from "@/components/stats/FichasEstadisticas";
import { EvolucionDiariaChart } from "@/components/stats/StatsCharts";
import {
  calcularRendimientoPorMateria,
  filtrarPorFecha,
  getResultadosFromCache,
  obtenerDashboardData,
  recortarPorBloque,
  UMBRAL_BANCO_CRITICO,
  type DashboardData,
  type FiltroTiempo,
} from "@/lib/persistence/estadisticas-service";
import { formatNotaSobre10 } from "@/lib/exam-utils";
import { sugerenciasBloque, sugerenciasGlobales, type Sugerencia } from "@/lib/para-aprobar";
import { getLocalCache, getSyncService } from "@/lib/persistence";
import { getChecklistMarks } from "@/lib/persistence/checklist-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { getSeguirItems, type SeguirItem } from "@/lib/study-continue";
import {
  construirTemarioChecklist,
  type MateriaCatalogo,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";

const OBJETIVO_DEFAULT = 70;
const nf = new Intl.NumberFormat("es-ES");

const CARD = "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5";

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

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function progressColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function notaHex(v: number | null | undefined): string {
  if (v == null) return "#cbd5e1";
  if (v >= 7) return "#10b981";
  if (v >= 5) return "#f59e0b";
  return "#ef4444";
}

function notaChip(v: number | null | undefined): string {
  if (v == null) return "bg-slate-100 text-slate-400";
  if (v >= 7) return "bg-emerald-50 text-emerald-700";
  if (v >= 5) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

const FILTROS: { id: FiltroTiempo; label: string }[] = [
  { id: "7dias", label: "Últimos 7 días" },
  { id: "30dias", label: "Últimos 30 días" },
  { id: "90dias", label: "Últimos 90 días" },
  { id: "todo", label: "Todo el historial" },
];

type EstadoFiltro = "todo" | "pendiente" | "hecho" | "fallos";
type Orden = "temario" | "nota" | "pendientes" | "avance";

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
  const [seguir, setSeguir] = useState<SeguirItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFiltro>("todo");
  const [orden, setOrden] = useState<Orden>("temario");

  useEffect(() => {
    setSeguir(
      getSeguirItems().filter((s) => {
        const m = /(\d+)\s+de\s+(\d+)/.exec(s.hint);
        return !m || m[1] !== m[2];
      }),
    );
  }, []);

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
      setOrden("temario");
      router.replace(id ? `/estadisticas?bloque=${encodeURIComponent(id)}` : "/estadisticas", {
        scroll: false,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
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
  const resultadosBloque = useMemo(
    () => (bloqueIds ? recortarPorBloque(todos, bloqueIds) : todos),
    [todos, bloqueIds],
  );
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

  const hayCriticos = useMemo(
    () =>
      (data?.fallosPorBanco ?? []).some(
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
    if (orden === "nota") visibles.sort((a, b) => (a.nota ?? 99) - (b.nota ?? 99));
    else if (orden === "pendientes") visibles.sort((a, b) => b.pendientes - a.pendientes);
    return visibles;
  }, [materiaSel, data, bancosVigentes, pendientesPorBanco, estado, orden]);

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
    if (orden === "nota") {
      visibles.sort(
        (a, b) =>
          (rendMaterias?.get(a.materiaId)?.notaMedia ?? 99) -
          (rendMaterias?.get(b.materiaId)?.notaMedia ?? 99),
      );
    } else if (orden === "avance") {
      visibles.sort((a, b) => a.pctHecho - b.pctHecho);
    } else if (orden === "pendientes") {
      visibles.sort(
        (a, b) => (pendientesPorMateria.get(b.materiaId) ?? 0) - (pendientesPorMateria.get(a.materiaId) ?? 0),
      );
    }
    return visibles;
  }, [materias, estado, orden, rendMaterias, pendientesPorMateria]);

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

  const resumen = data?.resumen;
  const hayPeriodo = (data?.totalPeriodo ?? 0) > 0;
  const avance = materiaSel ?? checklist;
  const totalItems = materiaSel ? materiaSel.total : checklist.totalItems;
  const preguntasBloque = (materiaSel ? materiaSel.items : materias.flatMap((m) => m.items))
    .filter((i) => i.kind === "test")
    .reduce((s, i) => s + i.count, 0);
  const nombreBloque = materiaSel?.materiaNombre ?? "Todo el temario";
  const periodoLabel = FILTROS.find((f) => f.id === filtro)?.label.toLowerCase() ?? "";
  const nota = hayPeriodo ? (resumen?.notaMedia ?? null) : null;
  return (
    <div className="panel-progreso mx-auto max-w-6xl space-y-5 px-1 pb-8 sm:px-0">
      {/* El color global de los enlaces (sin capa) pisaría las utilidades de Tailwind. */}
      <style>{".panel-progreso a,.panel-progreso a:hover{color:revert-layer}"}</style>
      {/* Barra de control */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:gap-3 sm:p-3">
        <select
          aria-label="Bloque"
          className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 sm:max-w-sm"
          value={bloque}
          onChange={(e) => elegirBloque(e.target.value)}
        >
          <option value="">Todos los bloques</option>
          {materias.map((m) => (
            <option key={m.materiaId} value={m.materiaId}>
              {m.materiaNombre} · {m.pctHecho}%
            </option>
          ))}
        </select>
        <select
          aria-label="Periodo"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroTiempo)}
        >
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {materiaSel && (
          <button
            type="button"
            onClick={() => elegirBloque("")}
            className="rounded-xl px-2.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            ✕ Quitar bloque
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing || phase === "syncing"}
          title={lastSync ? `Sincronizado · ${formatFecha(lastSync)}` : "Sin sincronizar aún"}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              phase === "syncing" || syncing
                ? "bg-amber-400"
                : phase === "synced"
                  ? "bg-emerald-500"
                  : "bg-slate-300"
            }`}
          />
          {syncing || phase === "syncing" ? "Sincronizando…" : "Actualizar"}
        </button>
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
          {/* Panel principal */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Avance */}
            <section className={CARD}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avance · {nombreBloque}
              </p>
              <div className="flex items-center gap-4">
                <Anillo pct={avance.pctHecho} color="#2563eb">
                  <span className="text-3xl font-bold tabular-nums text-slate-900">{avance.pctHecho}%</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">hecho</span>
                </Anillo>
                <div className="flex-1 space-y-3">
                  <Progreso label="Tests" hechos={avance.testsHechos} total={avance.testsTotal} color="bg-blue-500" />
                  <Progreso label="Fichas" hechos={avance.fichasHechas} total={avance.fichasTotal} color="bg-emerald-500" />
                  <p className="text-xs text-slate-500">
                    {avance.hechos} de {totalItems} bancos y mazos · {nf.format(preguntasBloque)} preguntas
                  </p>
                </div>
              </div>
            </section>

            {/* Nota */}
            <section className={CARD}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rendimiento · {periodoLabel}
              </p>
              <div className="flex items-center gap-4">
                <Anillo pct={nota !== null ? Math.max(0, nota) * 10 : 0} color={notaHex(nota)}>
                  <span className="text-3xl font-bold tabular-nums" style={{ color: nota !== null ? notaHex(nota) : "#94a3b8" }}>
                    {nota !== null ? formatNotaSobre10(nota) : "—"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">nota media</span>
                </Anillo>
                <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5">
                  <MiniStat label="Aciertos" value={hayPeriodo ? `${(resumen?.aciertosGlobal ?? 0).toFixed(0)}%` : "—"} />
                  <MiniStat label="Tests" value={String(resumen?.testsCompletados ?? 0)} />
                  <MiniStat
                    label="Por test"
                    value={resumen?.tiempoPorTest != null ? formatTiempo(resumen.tiempoPorTest) : "—"}
                  />
                  <MiniStat
                    label="Racha"
                    value={`${resumen?.rachaActual ?? 0} día${(resumen?.rachaActual ?? 0) === 1 ? "" : "s"}`}
                  />
                </dl>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {hayPeriodo ? (
                  "Nota de examen: cada fallo resta 1/4 de acierto"
                ) : (
                  <>
                    Sin preguntas de este bloque en el periodo.{" "}
                    {filtro !== "todo" && (
                      <button type="button" className="font-medium text-blue-700 hover:underline" onClick={() => setFiltro("todo")}>
                        Ver todo el historial
                      </button>
                    )}
                  </>
                )}
              </p>
            </section>

            {/* Qué estudiar */}
            <section className={`${CARD} order-first border-blue-200 bg-gradient-to-br from-blue-50 to-white lg:order-none`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {materiaSel ? `Qué estudiar en ${materiaSel.materiaNombre}` : "Qué estudiar ahora"}
              </p>
              <ol className="m-0 list-none space-y-1.5 p-0">
                {seguir.slice(0, materiaSel ? 0 : 1).map((s) => (
                  <PasoEstudio key={s.href} href={s.href} titulo={`Sigue: ${s.title}`} detalle={s.hint} destacado />
                ))}
                {sugerencias.slice(0, 4).map((s) => (
                  <PasoEstudio key={s.href + s.titulo} href={s.href} titulo={s.titulo} detalle={s.detalle} />
                ))}
              </ol>
              {totalPendientes > 0 && !materiaSel && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/repaso-fallos?modo=maraton"
                    className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 no-underline hover:bg-orange-200"
                  >
                    🏃 Maratón de fallos
                  </Link>
                  {hayCriticos && (
                    <Link
                      href="/repaso-fallos?modo=criticos"
                      className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 no-underline hover:bg-red-200"
                    >
                      ⚠️ Bancos críticos
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Mapa de bloques / bancos del bloque */}
          <section className={CARD}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {materiaSel ? `Bancos de ${materiaSel.materiaNombre}` : "Mapa de bloques"}
                </h2>
                <p className="text-xs text-slate-500">
                  {materiaSel
                    ? `Barra: % de aciertos (${periodoLabel}) · en rojo, fallos sin acertar todavía`
                    : "Barra azul: temario hecho · círculo: nota del periodo · pulsa un bloque para entrar"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
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
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      estado === id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <select
                  aria-label="Ordenar"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                >
                  <option value="temario">{materiaSel ? "Orden del temario" : "Alfabético"}</option>
                  <option value="nota">Peor nota primero</option>
                  <option value="pendientes">Más fallos primero</option>
                  {!materiaSel && <option value="avance">Menos avance primero</option>}
                </select>
              </div>
            </div>

            {materiaSel ? (
              <MapaBancos filas={filasBancos} />
            ) : (
              <MapaMaterias
                filas={filasMaterias}
                rend={rendMaterias}
                pendientes={pendientesPorMateria}
                onElegir={elegirBloque}
              />
            )}
          </section>

          {/* Evolución */}
          <section className={CARD}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Evolución</h2>
                  <p className="text-xs text-slate-500">% de aciertos por día · {periodoLabel}</p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
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
                    className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-800"
                  />
                  %
                </label>
              </div>
              {hayPeriodo ? (
                <EvolucionDiariaChart
                  data={data?.evolucion ?? []}
                  mediaPeriodo={data?.mediaPeriodo}
                  objetivoPct={objetivoPct}
                />
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">Sin actividad en este periodo.</p>
              )}
          </section>

          {/* Actividad + fichas */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Ritmo
              resultados={resultadosBloque}
              todos={todos}
              bloqueIds={bloqueIds}
              testsPendientes={Math.max(0, avance.testsTotal - avance.testsHechos)}
              nombreBloque={nombreBloque}
            />
            <FichasEstadisticas key={bloque || "todos"} mazos={mazosBloque} />
          </div>
        </>
      )}

      {/* Informes y copias */}
      <details className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Informes, impresión y copias
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/imprimir/resultados?periodo=${filtro}`} target="_blank" rel="noopener noreferrer" className={BTN}>
            Imprimir informe de tests
          </a>
          <a href="/imprimir/temario/resultados" target="_blank" rel="noopener noreferrer" className={BTN}>
            Notas por materia (PDF)
          </a>
          <a href="/imprimir/temario" target="_blank" rel="noopener noreferrer" className={BTN}>
            Imprimir inventario del temario
          </a>
          <button type="button" onClick={() => void handleExportLocal()} disabled={syncing || phase === "syncing"} className={BTN}>
            Exportar JSON
          </button>
          <button type="button" onClick={() => void handlePushAll()} disabled={syncing || phase === "syncing"} className={BTN}>
            Subir historial local
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          «Subir historial local» manda a la nube todos los tests guardados en este navegador.
          «Exportar JSON» sirve para importarlos en la app de escritorio.
        </p>
      </details>
    </div>
  );
}

const BTN =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60";

function Progreso({ label, hechos, total, color }: { label: string; hechos: number; total: number; color: string }) {
  const p = total > 0 ? Math.round((hechos / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500">
          {hechos}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-slate-800">{value}</dd>
    </div>
  );
}

function PasoEstudio({
  href,
  titulo,
  detalle,
  destacado,
}: {
  href: string;
  titulo: string;
  detalle: string;
  destacado?: boolean;
}) {
  return (
    <li className="list-none">
      <Link
        href={href}
        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 no-underline transition ${
          destacado ? "bg-blue-600 hover:bg-blue-700" : "bg-white ring-1 ring-slate-200 hover:ring-blue-300"
        }`}
        style={{ color: destacado ? "#ffffff" : "#1e293b", textDecoration: "none" }}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold" style={{ color: destacado ? "#ffffff" : "#1e293b" }}>
            {titulo}
          </span>
          <span className="block truncate text-xs" style={{ color: destacado ? "#dbeafe" : "#64748b" }}>
            {detalle}
          </span>
        </span>
        <span aria-hidden style={{ color: destacado ? "#ffffff" : "#2563eb" }}>
          →
        </span>
      </Link>
    </li>
  );
}

function NotaCirculo({ nota }: { nota: number | null }) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${notaChip(nota)}`}
      title={nota !== null ? `Nota ${formatNotaSobre10(nota)}` : "Sin nota en el periodo"}
    >
      {nota !== null ? formatNotaSobre10(nota) : "—"}
    </span>
  );
}

function MapaMaterias({
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
  if (!filas.length) return <p className="text-sm text-slate-500">Ningún bloque con este filtro.</p>;
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {filas.map((m) => {
        const r = rend?.get(m.materiaId);
        const pend = pendientes.get(m.materiaId) ?? 0;
        return (
          <li key={m.materiaId}>
            <button
              type="button"
              onClick={() => onElegir(m.materiaId)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <NotaCirculo nota={r?.notaMedia ?? null} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{m.materiaNombre}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{m.pctHecho}%</span>
                </span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-blue-500" style={{ width: `${m.pctHecho}%` }} />
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                  {m.testsTotal > 0 && <span>Tests {m.testsHechos}/{m.testsTotal}</span>}
                  {m.fichasTotal > 0 && <span>Fichas {m.fichasHechas}/{m.fichasTotal}</span>}
                  {r && <span>{r.porcentaje.toFixed(0)}% aciertos</span>}
                  {pend > 0 && <span className="font-semibold text-red-600">{pend} fallos</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MapaBancos({ filas }: { filas: FilaBanco[] }) {
  const router = useRouter();
  if (!filas.length) return <p className="text-sm text-slate-500">Ningún banco con este filtro.</p>;
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {filas.map((f) => (
        <li key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
          <NotaCirculo nota={f.nota} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              {f.abrible ? (
                <Link href={`/test/${f.id}`} className="truncate text-sm font-semibold text-slate-800 hover:text-[var(--primary)]">
                  {f.nombre}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold text-slate-800">{f.nombre}</span>
              )}
              {f.porcentaje !== null ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{f.porcentaje.toFixed(0)}%</span>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {f.hecho ? "fuera del periodo" : "sin empezar"}
                </span>
              )}
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              {f.porcentaje !== null && (
                <div
                  className={`h-full rounded-full ${progressColor(f.porcentaje)}`}
                  style={{ width: `${Math.min(100, Math.max(0, f.porcentaje))}%` }}
                />
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              <span>{f.preguntas !== null ? `${nf.format(f.preguntas)} preg.` : "simulacros y repasos"}</span>
              {f.intentos > 0 && <span>{f.intentos} intento{f.intentos === 1 ? "" : "s"}</span>}
              {f.tiempo !== null && <span>{formatTiempo(f.tiempo)} de media</span>}
              {f.pendientes > 0 && <span className="font-semibold text-red-600">{f.pendientes} fallos</span>}
            </div>
          </div>
          {f.pendientes > 0 ? (
            <button
              type="button"
              title="Repasar fallos"
              className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              onClick={() => {
                const q = new URLSearchParams({ modo: "banco", banco: f.id, nombre: f.nombre });
                router.push(`/repaso-fallos?${q}`);
              }}
            >
              Repasar
            </button>
          ) : f.abrible ? (
            <Link
              href={`/test/${f.id}`}
              className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white no-underline hover:bg-blue-700"
            >
              {f.hecho ? "Repetir" : "Empezar"}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type Ventana = { preguntas: number; aciertos: number; fallos: number };

function sumarVentana(resultados: TestResultRecord[], desde: number, hasta: number): Ventana {
  const v = { preguntas: 0, aciertos: 0, fallos: 0 };
  for (const r of resultados) {
    const t = Date.parse(r.fecha);
    if (t < desde || t >= hasta) continue;
    v.preguntas += r.totalPreguntas;
    v.aciertos += r.aciertos;
    v.fallos += r.fallos;
  }
  return v;
}

function pctVentana(v: Ventana): number | null {
  return v.preguntas > 0 ? (100 * v.aciertos) / v.preguntas : null;
}

function Delta({ ahora, antes, sufijo = "" }: { ahora: number | null; antes: number | null; sufijo?: string }) {
  if (ahora === null || antes === null) return null;
  const d = ahora - antes;
  if (Math.abs(d) < 0.5) return <span className="text-xs text-slate-400">= que la anterior</span>;
  const sube = d > 0;
  return (
    <span className={`text-xs font-semibold ${sube ? "text-emerald-600" : "text-red-600"}`}>
      {sube ? "▲" : "▼"} {Math.abs(Math.round(d))}
      {sufijo} vs semana anterior
    </span>
  );
}

function Ritmo({
  resultados,
  todos,
  bloqueIds,
  testsPendientes,
  nombreBloque,
}: {
  /** Resultados ya recortados al bloque (preguntas del bloque). */
  resultados: TestResultRecord[];
  /** Historial completo, para saber cuándo empezaste cada banco. */
  todos: TestResultRecord[];
  bloqueIds?: ReadonlySet<string>;
  testsPendientes: number;
  nombreBloque: string;
}) {
  const r = useMemo(() => {
    const DIA = 86_400_000;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finHoy = hoy.getTime() + DIA;
    const semana = sumarVentana(resultados, finHoy - 7 * DIA, finHoy);
    const anterior = sumarVentana(resultados, finHoy - 14 * DIA, finHoy - 7 * DIA);

    const porDia = new Map<string, number>();
    for (const x of resultados) {
      const k = diaLocal(new Date(x.fecha));
      porDia.set(k, (porDia.get(k) ?? 0) + x.totalPreguntas);
    }
    const dias: { key: string; n: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy.getTime() - i * DIA);
      const key = diaLocal(d);
      dias.push({
        key,
        n: porDia.get(key) ?? 0,
        label: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
      });
    }
    let activos30 = 0;
    for (let i = 0; i < 30; i++) {
      if (porDia.has(diaLocal(new Date(hoy.getTime() - i * DIA)))) activos30 += 1;
    }

    const primerIntento = new Map<string, number>();
    for (const x of todos) {
      if (bloqueIds ? !bloqueIds.has(x.banco) : !/^[0-9a-f-]{36}$/i.test(x.banco)) continue;
      const t = Date.parse(x.fecha);
      const prev = primerIntento.get(x.banco);
      if (prev === undefined || t < prev) primerIntento.set(x.banco, t);
    }
    const nuevos28 = [...primerIntento.values()].filter((t) => t >= finHoy - 28 * DIA).length;
    const porSemana = nuevos28 / 4;
    const semanasFin = porSemana > 0 ? Math.ceil(testsPendientes / porSemana) : null;
    const fechaFin =
      semanasFin !== null
        ? new Date(hoy.getTime() + semanasFin * 7 * DIA).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null;

    return {
      semana,
      anterior,
      dias,
      max: Math.max(1, ...dias.map((d) => d.n)),
      activos30,
      porSemana,
      semanasFin,
      fechaFin,
    };
  }, [resultados, todos, bloqueIds, testsPendientes]);

  const pctAhora = pctVentana(r.semana);
  const pctAntes = pctVentana(r.anterior);

  return (
    <section className={CARD}>
      <h2 className="text-base font-semibold text-slate-800">Tu ritmo</h2>
      <p className="mb-3 text-xs text-slate-500">{nombreBloque} · últimos 7 días</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Preguntas</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{nf.format(r.semana.preguntas)}</p>
          <Delta ahora={r.semana.preguntas} antes={r.anterior.preguntas} />
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Aciertos</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {pctAhora !== null ? `${pctAhora.toFixed(0)}%` : "—"}
          </p>
          <Delta ahora={pctAhora} antes={pctAntes} sufijo=" pts" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>Preguntas por día · 14 días</span>
          <span>
            {r.activos30} de 30 días con estudio
          </span>
        </div>
        <div className="flex h-20 items-end gap-1" role="img" aria-label="Preguntas respondidas por día">
          {r.dias.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.n} preguntas`}>
              <div
                className={`w-full rounded-t ${d.n ? "bg-blue-500" : "bg-slate-100"}`}
                style={{ height: d.n ? `${Math.max(6, (d.n / r.max) * 100)}%` : "4px" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-700">
        {testsPendientes === 0 ? (
          <span>Has empezado todos los tests de {nombreBloque}. Toca subir nota y repasar fallos.</span>
        ) : r.semanasFin !== null ? (
          <span>
            Empiezas unos <strong>{r.porSemana.toFixed(1).replace(".", ",")} bancos nuevos por semana</strong>. A
            este ritmo te quedan <strong>{r.semanasFin} semana{r.semanasFin === 1 ? "" : "s"}</strong> para
            haber hecho los {testsPendientes} tests que faltan (hacia el {r.fechaFin}).
          </span>
        ) : (
          <span>
            Llevas 4 semanas sin empezar ningún banco nuevo y quedan <strong>{testsPendientes}</strong> por
            hacer. Mira «Qué estudiar ahora».
          </span>
        )}
      </div>
    </section>
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
