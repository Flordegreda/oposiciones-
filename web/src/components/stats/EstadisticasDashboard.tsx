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
import { getSeguirItems, type SeguirItem } from "@/lib/study-continue";
import {
  construirTemarioChecklist,
  type MateriaCatalogo,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";

const OBJETIVO_DEFAULT = 70;
const TESTS_VISIBLES = 6;
const SEMANAS_ACTIVIDAD = 15;
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

function formatFechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return `hoy ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `ayer ${hora}`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
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
  const [detalle, setDetalle] = useState<TestReciente | null>(null);
  const [verTodosTests, setVerTodosTests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFiltro>("todo");
  const [orden, setOrden] = useState<Orden>("temario");

  useEffect(() => {
    setSeguir(getSeguirItems());
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
  const totalItems = materiaSel ? materiaSel.total : checklist.totalItems;
  const preguntasBloque = (materiaSel ? materiaSel.items : materias.flatMap((m) => m.items))
    .filter((i) => i.kind === "test")
    .reduce((s, i) => s + i.count, 0);
  const nombreBloque = materiaSel?.materiaNombre ?? "Todo el temario";
  const periodoLabel = FILTROS.find((f) => f.id === filtro)?.label.toLowerCase() ?? "";
  const nota = hayPeriodo ? (resumen?.notaMedia ?? null) : null;
  const tests = data?.testsRecientes ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 pb-8 sm:px-0">
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
              <ol className="space-y-1.5">
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

          {/* Evolución + actividad */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className={`${CARD} lg:col-span-2`}>
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
            <Actividad resultados={todos} racha={resumen?.rachaActual ?? 0} />
          </div>

          {/* Fichas + últimos tests */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FichasEstadisticas key={bloque || "todos"} mazos={mazosBloque} />
            <section className={CARD}>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-800">Últimos tests</h2>
                {tests.length > TESTS_VISIBLES && (
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-700 hover:underline"
                    onClick={() => setVerTodosTests(true)}
                  >
                    Ver todos ({tests.length}) →
                  </button>
                )}
              </div>
              {tests.length === 0 ? (
                <p className="text-sm text-slate-500">Ningún test en este periodo.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tests.slice(0, TESTS_VISIBLES).map((t) => (
                    <FilaTest key={t.id} test={t} onClick={() => setDetalle(t)} />
                  ))}
                </ul>
              )}
              {materiaSel && tests.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  En simulacros solo cuentan las preguntas de este bloque.
                </p>
              )}
            </section>
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

      {verTodosTests && (
        <Modal titulo={`Tests · ${periodoLabel}`} onClose={() => setVerTodosTests(false)}>
          <ul className="divide-y divide-slate-100">
            {tests.map((t) => (
              <FilaTest
                key={t.id}
                test={t}
                onClick={() => {
                  setVerTodosTests(false);
                  setDetalle(t);
                }}
              />
            ))}
          </ul>
        </Modal>
      )}

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
    <li>
      <Link
        href={href}
        className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 no-underline transition ${
          destacado ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-blue-300"
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{titulo}</span>
          <span className={`block truncate text-xs ${destacado ? "text-blue-100" : "text-slate-500"}`}>{detalle}</span>
        </span>
        <span aria-hidden className={destacado ? "text-white" : "text-blue-600"}>
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

function Actividad({ resultados, racha }: { resultados: TestResultRecord[]; racha: number }) {
  const { semanas, diasActivos, maxDia } = useMemo(() => {
    const porDia = new Map<string, number>();
    for (const r of resultados) {
      const k = diaLocal(new Date(r.fecha));
      porDia.set(k, (porDia.get(k) ?? 0) + 1);
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - (SEMANAS_ACTIVIDAD - 1) * 7);
    const semanas: { key: string; n: number; futuro: boolean; label: string }[][] = [];
    let activos = 0;
    let max = 0;
    for (let w = 0; w < SEMANAS_ACTIVIDAD; w++) {
      const col: { key: string; n: number; futuro: boolean; label: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const dia = new Date(inicio);
        dia.setDate(inicio.getDate() + w * 7 + d);
        const key = diaLocal(dia);
        const n = porDia.get(key) ?? 0;
        if (n > 0) activos += 1;
        max = Math.max(max, n);
        col.push({
          key,
          n,
          futuro: dia > hoy,
          label: dia.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
        });
      }
      semanas.push(col);
    }
    return { semanas, diasActivos: activos, maxDia: max };
  }, [resultados]);

  const tono = (n: number) =>
    n === 0 ? "bg-slate-100" : n === 1 ? "bg-emerald-200" : n <= 3 ? "bg-emerald-400" : "bg-emerald-600";

  return (
    <section className={CARD}>
      <h2 className="text-base font-semibold text-slate-800">Días de estudio</h2>
      <p className="mb-3 text-xs text-slate-500">
        Últimas {SEMANAS_ACTIVIDAD} semanas · todos los bloques
      </p>
      <div className="flex gap-[3px]" role="img" aria-label={`${diasActivos} días con tests`}>
        {semanas.map((col, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {col.map((c) => (
              <span
                key={c.key}
                title={c.futuro ? "" : `${c.label}: ${c.n} test${c.n === 1 ? "" : "s"}`}
                className={`aspect-square w-full rounded-[3px] ${c.futuro ? "bg-transparent" : tono(c.n)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-lg font-bold tabular-nums text-slate-800">{racha}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">racha</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-lg font-bold tabular-nums text-slate-800">{diasActivos}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">días activos</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-lg font-bold tabular-nums text-slate-800">{maxDia}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">máx. en un día</p>
        </div>
      </div>
    </section>
  );
}

function FilaTest({ test: t, onClick }: { test: TestReciente; onClick: () => void }) {
  const nota = examNotaSobre10(t.aciertos, t.fallos, t.totalPreguntas);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 py-2 text-left transition hover:bg-slate-50"
      >
        <NotaCirculo nota={nota} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">{t.test}</span>
          <span className="block truncate text-xs text-slate-500">
            {t.aciertos}/{t.totalPreguntas} aciertos · {t.fallos} fallos · {formatTiempo(t.tiempoTotal)}
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-400">{formatFechaCorta(t.fecha)}</span>
      </button>
    </li>
  );
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800">{titulo}</h3>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
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
    <Modal titulo={test.test} onClose={onClose}>
      <p className="-mt-2 mb-4 text-sm text-slate-500">{test.bancoNombre}</p>
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
    </Modal>
  );
}
