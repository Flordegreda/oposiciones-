/**
 * Cálculo de estadísticas del dashboard a partir de la caché local (IndexedDB).
 */

import { isProgresoBanco } from "@/lib/persistence/account";
import { getVoidedIdSet } from "@/lib/persistence/voided-results";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type {
  BancoCacheEntry,
  PreguntaResultadoDetalle,
  TestResultRecord,
} from "@/lib/persistence/types";

export type FiltroTiempo = "7dias" | "30dias" | "90dias" | "todo";

export type ResumenEstadisticas = {
  testsCompletados: number;
  aciertosGlobal: number;
  /** Nota sobre 10 con la penalización del examen (cada fallo resta 1/4). */
  notaMedia: number | null;
  tiempoPorTest: number | null;
  rachaActual: number;
};

export type PuntoEvolucion = {
  fecha: string;
  etiqueta: string;
  porcentajeAciertos: number | null;
  /** Tests realizados ese día (0 si sin actividad). */
  tests: number;
  sinActividad: boolean;
};

export type RendimientoBanco = {
  banco: string;
  bancoNombre: string;
  porcentaje: number;
  totalTests: number;
  /** Días desde el último test de este banco (null si desconocido). */
  diasSinPracticar: number | null;
  color: "verde" | "amarillo" | "rojo";
};

export type TiempoMedioBanco = {
  banco: string;
  bancoNombre: string;
  tiempoMedioSegundos: number;
  totalTests: number;
};

export type RecomendacionStats = {
  tipo: "repasar" | "mantener" | "racha" | "ninguna";
  mensaje: string;
  bancoId?: string;
  bancoNombre?: string;
};

export type PreguntaFallada = {
  preguntaId: string;
  texto: string;
  fallos: number;
  totalApariciones: number;
  porcentajeFallos: number;
  banco: string;
  bancoNombre: string;
  /** Marcada tras un repaso de fallos. */
  repasada?: boolean;
  fechaRepaso?: string | null;
};

export type TestReciente = {
  id: string;
  banco: string;
  bancoNombre: string;
  test: string;
  aciertos: number;
  fallos: number;
  totalPreguntas: number;
  porcentaje: number;
  tiempoTotal: number | null;
  fecha: string;
  detallePreguntas?: PreguntaResultadoDetalle[];
};

export type FallosAgregadosBanco = {
  banco: string;
  bancoNombre: string;
  porcentajeAciertos: number;
  totalRespondidas: number;
  /** Preguntas distintas cuya última respuesta fue incorrecta. */
  totalFallidas: number;
  totalAciertos: number;
};

export type DashboardData = {
  resumen: ResumenEstadisticas;
  evolucion: PuntoEvolucion[];
  mediaPeriodo: number | null;
  rendimientoBancos: RendimientoBanco[];
  tiempoMedioBancos: TiempoMedioBanco[];
  preguntasFalladas: PreguntaFallada[];
  /** Agregado por banco a nivel pregunta (detalle). */
  fallosPorBanco: FallosAgregadosBanco[];
  testsRecientes: TestReciente[];
  recomendacion: RecomendacionStats;
  /** Tests en todo el historial (sin filtro de fechas). */
  totalHistorial: number;
  /** Tests tras aplicar el filtro de periodo. */
  totalPeriodo: number;
};

const PSEUDO_BANCOS = new Set(["simulacro", "repaso_fallos", "desconocido"]);

export const UMBRAL_BANCO_CRITICO = 65;

function esBancoReal(banco: string, bancos: BancoCacheEntry[]): boolean {
  if (PSEUDO_BANCOS.has(banco)) return false;
  if (bancos.some((b) => b.id === banco)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(banco);
}

/** Banco UUID de una pregunta en el detalle (simulacro/repaso incl.). */
export function bancoDeDetallePregunta(
  d: PreguntaResultadoDetalle,
  r: TestResultRecord,
  bancos: BancoCacheEntry[] = [],
): string | null {
  if (d.bancoId && esBancoReal(d.bancoId, bancos)) return d.bancoId;
  if (esBancoReal(r.banco, bancos)) return r.banco;
  return null;
}

const DETALLE_KEY = "__detalle";
const TIPO_KEY = "__tipo";

export function embedDetalleInRespuestas(
  respuestas: Record<string, number | null>,
  detalle?: PreguntaResultadoDetalle[],
  tipo?: TestResultRecord["tipo"],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...respuestas };
  if (detalle?.length) out[DETALLE_KEY] = detalle;
  if (tipo) out[TIPO_KEY] = tipo;
  return out;
}

export function extractDetalleFromRespuestas(
  respuestas: Record<string, unknown> | null | undefined,
): {
  selecciones: Record<string, number | null>;
  detalle?: PreguntaResultadoDetalle[];
  tipo?: TestResultRecord["tipo"];
} {
  if (!respuestas || typeof respuestas !== "object") {
    return { selecciones: {} };
  }
  const selecciones: Record<string, number | null> = {};
  let detalle: PreguntaResultadoDetalle[] | undefined;
  let tipo: TestResultRecord["tipo"] | undefined;
  for (const [k, v] of Object.entries(respuestas)) {
    if (k === DETALLE_KEY && Array.isArray(v)) {
      detalle = v as PreguntaResultadoDetalle[];
      continue;
    }
    if (k === TIPO_KEY && (v === "normal" || v === "repaso_fallos")) {
      tipo = v;
      continue;
    }
    selecciones[k] = typeof v === "number" || v === null ? (v as number | null) : null;
  }
  return { selecciones, detalle, tipo };
}

export async function getResultadosFromCache(): Promise<TestResultRecord[]> {
  const cache = getLocalCache();
  const usuarioId = getOrCreateUsuarioId();
  const voided = getVoidedIdSet();
  const all = await cache.getAllResultados();
  return all
    .filter(
      (r) =>
        r.usuarioId === usuarioId && !isProgresoBanco(r.banco) && !voided.has(r.id),
    )
    .map(normalizeResultado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function normalizeResultado(r: TestResultRecord): TestResultRecord {
  if (r.detallePreguntas?.length) {
    return {
      ...r,
      tipo: r.tipo ?? (r.banco === "repaso_fallos" ? "repaso_fallos" : "normal"),
    };
  }
  const { selecciones, detalle, tipo } = extractDetalleFromRespuestas(
    r.respuestas as Record<string, unknown>,
  );
  return {
    ...r,
    respuestas: selecciones,
    detallePreguntas: detalle,
    tipo: r.tipo ?? tipo ?? (r.banco === "repaso_fallos" ? "repaso_fallos" : "normal"),
  };
}

export function filtrarPorFecha(
  resultados: TestResultRecord[],
  filtro: FiltroTiempo,
): TestResultRecord[] {
  if (filtro === "todo") return resultados;
  const days = filtro === "7dias" ? 7 : filtro === "30dias" ? 30 : 90;
  const from = Date.now() - days * 24 * 60 * 60 * 1000;
  return resultados.filter((r) => Date.parse(r.fecha) >= from);
}

/** Día civil local `YYYY-MM-DD` (evita desfases UTC en España). */
function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return localDayKey(d);
}

function addLocalDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + delta);
  return localDayKey(dt);
}

function labelDdMm(isoDay: string): string {
  const [, m, d] = isoDay.split("-");
  return `${d}/${m}`;
}

function colorPorPorcentaje(pct: number): "verde" | "amarillo" | "rojo" {
  if (pct >= 75) return "verde";
  if (pct >= 60) return "amarillo";
  return "rojo";
}

function bancoNombreFrom(
  bancoId: string,
  testTitle: string,
  bancos: BancoCacheEntry[],
): string {
  const hit = bancos.find((b) => b.id === bancoId);
  if (hit?.nombre) return hit.nombre;
  if (bancoId === "simulacro") return "Simulacro";
  if (bancoId === "repaso_fallos") return "Repaso de fallos";
  return testTitle || bancoId.slice(0, 8);
}

/** KPI superiores del dashboard. */
export function obtenerEstadisticasResumen(
  resultados: TestResultRecord[],
): ResumenEstadisticas {
  return calcularResumen(resultados);
}

export function calcularResumen(resultados: TestResultRecord[]): ResumenEstadisticas {
  const testsCompletados = resultados.length;
  const totalPreguntas = resultados.reduce((n, r) => n + r.totalPreguntas, 0);
  const totalAciertos = resultados.reduce((n, r) => n + r.aciertos, 0);
  const totalFallos = resultados.reduce((n, r) => n + r.fallos, 0);
  const tiempos = resultados
    .map((r) => r.tiempoTotal)
    .filter((t): t is number => typeof t === "number" && t >= 0);

  return {
    testsCompletados,
    aciertosGlobal: totalPreguntas > 0 ? (totalAciertos / totalPreguntas) * 100 : 0,
    notaMedia:
      totalPreguntas > 0
        ? (10 * (totalAciertos - totalFallos / 4)) / totalPreguntas
        : null,
    tiempoPorTest: tiempos.length
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
      : null,
    rachaActual: calcularRacha(resultados),
  };
}

export function calcularRacha(resultados: TestResultRecord[]): number {
  if (!resultados.length) return 0;
  const days = new Set(resultados.map((r) => dayKey(r.fecha)));
  const today = localDayKey();
  const yesterday = addLocalDays(today, -1);

  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  while (cursor && days.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function calcularEvolucionDiaria(
  resultados: TestResultRecord[],
  dias: number,
): PuntoEvolucion[] {
  const byDay = new Map<string, { aciertos: number; total: number; tests: number }>();
  for (const r of resultados) {
    const k = dayKey(r.fecha);
    const cur = byDay.get(k) ?? { aciertos: 0, total: 0, tests: 0 };
    cur.aciertos += r.aciertos;
    cur.total += r.totalPreguntas;
    cur.tests += 1;
    byDay.set(k, cur);
  }

  const hoy = localDayKey();
  // Sin relleno vacío previo: el eje empieza en el primer test (o hoy).
  let inicio = hoy;
  if (resultados.length) {
    let first = dayKey(resultados[0]!.fecha);
    for (const r of resultados) {
      const k = dayKey(r.fecha);
      if (k < first) first = k;
    }
    const limiteFiltro = addLocalDays(hoy, -(Math.max(1, dias) - 1));
    // No mostrar días anteriores al primer test; el filtro solo acota hacia atrás.
    inicio = first < limiteFiltro ? limiteFiltro : first;
  }

  const out: PuntoEvolucion[] = [];
  for (let key = inicio; ; key = addLocalDays(key, 1)) {
    const hit = byDay.get(key);
    if (!hit || hit.total === 0) {
      out.push({
        fecha: key,
        etiqueta: labelDdMm(key),
        porcentajeAciertos: null,
        tests: 0,
        sinActividad: true,
      });
    } else {
      out.push({
        fecha: key,
        etiqueta: labelDdMm(key),
        porcentajeAciertos: (hit.aciertos / hit.total) * 100,
        tests: hit.tests,
        sinActividad: false,
      });
    }
    if (key >= hoy) break;
    // Seguridad ante bucles absurdos
    if (out.length > 400) break;
  }
  return out;
}

function diasDesde(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export function calcularRendimientoPorBanco(
  resultados: TestResultRecord[],
  bancos: BancoCacheEntry[] = [],
): RendimientoBanco[] {
  const map = new Map<
    string,
    {
      aciertos: number;
      total: number;
      tests: number;
      title: string;
      ultimoTest: string | null;
    }
  >();

  for (const r of resultados) {
    const cur = map.get(r.banco) ?? {
      aciertos: 0,
      total: 0,
      tests: 0,
      title: r.test,
      ultimoTest: null,
    };
    cur.aciertos += r.aciertos;
    cur.total += r.totalPreguntas;
    cur.tests += 1;
    cur.title = r.test;
    if (!cur.ultimoTest || r.fecha > cur.ultimoTest) cur.ultimoTest = r.fecha;
    map.set(r.banco, cur);
  }

  return [...map.entries()]
    .map(([banco, v]) => {
      const porcentaje = v.total > 0 ? (v.aciertos / v.total) * 100 : 0;
      return {
        banco,
        bancoNombre: bancoNombreFrom(banco, v.title, bancos),
        porcentaje,
        totalTests: v.tests,
        diasSinPracticar: v.ultimoTest ? diasDesde(v.ultimoTest) : null,
        color: colorPorPorcentaje(porcentaje),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

export function calcularTiempoMedioPorBanco(
  resultados: TestResultRecord[],
  bancos: BancoCacheEntry[] = [],
): TiempoMedioBanco[] {
  const map = new Map<
    string,
    { suma: number; n: number; title: string }
  >();

  for (const r of resultados) {
    if (typeof r.tiempoTotal !== "number" || r.tiempoTotal < 0) continue;
    const cur = map.get(r.banco) ?? { suma: 0, n: 0, title: r.test };
    cur.suma += r.tiempoTotal;
    cur.n += 1;
    cur.title = r.test;
    map.set(r.banco, cur);
  }

  return [...map.entries()]
    .map(([banco, v]) => ({
      banco,
      bancoNombre: bancoNombreFrom(banco, v.title, bancos),
      tiempoMedioSegundos: Math.round(v.suma / v.n),
      totalTests: v.n,
    }))
    .sort((a, b) => b.tiempoMedioSegundos - a.tiempoMedioSegundos);
}

/** Recomendación contextual para la cabecera del dashboard. */
export function generarRecomendacion(
  rendimientoBancos: RendimientoBanco[],
  resultados: TestResultRecord[],
): RecomendacionStats {
  if (!resultados.length) {
    return { tipo: "ninguna", mensaje: "" };
  }

  const ultimoGlobal = resultados.reduce(
    (max, r) => (r.fecha > max ? r.fecha : max),
    resultados[0]!.fecha,
  );
  const diasSinTest = diasDesde(ultimoGlobal);

  if (diasSinTest >= 2) {
    return {
      tipo: "racha",
      mensaje:
        "👋 ¡Buen trabajo! No olvides practicar al menos un test al día para mantener la racha.",
    };
  }

  if (!rendimientoBancos.length) {
    return { tipo: "ninguna", mensaje: "" };
  }

  const todosVerdes = rendimientoBancos.every((b) => b.porcentaje >= 75);
  if (todosVerdes) {
    const menosTests = [...rendimientoBancos].sort(
      (a, b) => a.totalTests - b.totalTests,
    )[0]!;
    return {
      tipo: "mantener",
      mensaje: `🎉 ¡Vas muy bien! Sigue así con ${menosTests.bancoNombre} para no perder práctica.`,
      bancoId: menosTests.banco,
      bancoNombre: menosTests.bancoNombre,
    };
  }

  const peor = [...rendimientoBancos].sort((a, b) => {
    if (a.porcentaje !== b.porcentaje) return a.porcentaje - b.porcentaje;
    return (b.diasSinPracticar ?? 0) - (a.diasSinPracticar ?? 0);
  })[0]!;
  const dias = peor.diasSinPracticar ?? 0;
  return {
    tipo: "repasar",
    mensaje: `🔍 Te recomendamos repasar ${peor.bancoNombre}. Llevas ${dias} día${dias === 1 ? "" : "s"} sin practicarlo.`,
    bancoId: peor.banco,
    bancoNombre: peor.bancoNombre,
  };
}

export function obtenerPreguntasMasFalladas(
  resultados: TestResultRecord[],
  limite: number,
  bancos: BancoCacheEntry[] = [],
  filterBanco?: string,
): PreguntaFallada[] {
  const map = new Map<
    string,
    {
      texto: string;
      fallos: number;
      total: number;
      banco: string;
      title: string;
      ultimaFecha: string;
      ultimaCorrecta: boolean;
    }
  >();

  for (const r of resultados) {
    const detalle = r.detallePreguntas;
    if (!detalle?.length) continue;
    for (const d of detalle) {
      if (!d.respondida) continue;
      const banco = bancoDeDetallePregunta(d, r, bancos);
      if (!banco) continue;
      if (filterBanco && banco !== filterBanco) continue;
      const cur = map.get(d.preguntaId) ?? {
        texto: d.enunciado,
        fallos: 0,
        total: 0,
        banco,
        title: r.test,
        ultimaFecha: "",
        ultimaCorrecta: false,
      };
      cur.total += 1;
      if (!d.correcta) cur.fallos += 1;
      if (r.fecha > cur.ultimaFecha) {
        cur.ultimaFecha = r.fecha;
        cur.ultimaCorrecta = d.correcta;
        if (d.enunciado) cur.texto = d.enunciado;
      } else if (r.fecha === cur.ultimaFecha && d.correcta) {
        cur.ultimaCorrecta = true;
      }
      cur.banco = banco;
      map.set(d.preguntaId, cur);
    }
  }

  // Solo las que siguen pendientes: la última vez que la respondiste, la fallaste.
  return [...map.entries()]
    .filter(([, v]) => v.fallos > 0 && !v.ultimaCorrecta)
    .map(([preguntaId, v]) => ({
      preguntaId,
      texto: v.texto,
      fallos: v.fallos,
      totalApariciones: v.total,
      porcentajeFallos: v.total > 0 ? (v.fallos / v.total) * 100 : 0,
      banco: v.banco,
      bancoNombre: bancoNombreFrom(v.banco, v.title, bancos),
    }))
    .sort((a, b) => b.fallos - a.fallos || b.porcentajeFallos - a.porcentajeFallos)
    .slice(0, limite);
}

/** Estadísticas agregadas por banco a partir del detalle de preguntas. */
export function calcularFallosAgregadosPorBanco(
  resultados: TestResultRecord[],
  bancos: BancoCacheEntry[] = [],
): FallosAgregadosBanco[] {
  const map = new Map<
    string,
    {
      aciertos: number;
      respondidas: number;
      title: string;
      tituloPropio: boolean;
      ultima: Map<string, { fecha: string; correcta: boolean }>;
    }
  >();

  for (const r of resultados) {
    const detalle = r.detallePreguntas;
    if (!detalle?.length) continue;
    for (const d of detalle) {
      if (!d.respondida) continue;
      const banco = bancoDeDetallePregunta(d, r, bancos);
      if (!banco) continue;
      const cur = map.get(banco) ?? {
        aciertos: 0,
        respondidas: 0,
        title: r.test,
        tituloPropio: r.banco === banco,
        ultima: new Map(),
      };
      if (!cur.tituloPropio && r.banco === banco) {
        cur.title = r.test;
        cur.tituloPropio = true;
      }
      cur.respondidas += 1;
      if (d.correcta) cur.aciertos += 1;
      const prev = cur.ultima.get(d.preguntaId);
      if (!prev || r.fecha > prev.fecha) {
        cur.ultima.set(d.preguntaId, { fecha: r.fecha, correcta: d.correcta });
      } else if (r.fecha === prev.fecha && d.correcta) {
        prev.correcta = true;
      }
      map.set(banco, cur);
    }
  }

  return [...map.entries()]
    .map(([banco, v]) => ({
      banco,
      bancoNombre: bancoNombreFrom(banco, v.title, bancos),
      porcentajeAciertos:
        v.respondidas > 0 ? (v.aciertos / v.respondidas) * 100 : 0,
      totalRespondidas: v.respondidas,
      totalFallidas: [...v.ultima.values()].filter((u) => !u.correcta).length,
      totalAciertos: v.aciertos,
    }))
    .filter((b) => b.totalFallidas > 0)
    .sort((a, b) => a.porcentajeAciertos - b.porcentajeAciertos);
}

export function obtenerTestsRecientes(
  resultados: TestResultRecord[],
  limite: number,
  bancos: BancoCacheEntry[] = [],
): TestReciente[] {
  return resultados.slice(0, limite).map((r) => ({
    id: r.id,
    banco: r.banco,
    bancoNombre: bancoNombreFrom(r.banco, r.test, bancos),
    test: r.test,
    aciertos: r.aciertos,
    fallos: r.fallos,
    totalPreguntas: r.totalPreguntas,
    porcentaje:
      r.totalPreguntas > 0 ? (r.aciertos / r.totalPreguntas) * 100 : 0,
    tiempoTotal: r.tiempoTotal,
    fecha: r.fecha,
    detallePreguntas: r.detallePreguntas,
  }));
}

function diasParaEvolucion(filtro: FiltroTiempo): number {
  if (filtro === "7dias") return 7;
  if (filtro === "90dias") return 90;
  if (filtro === "todo") return 30;
  return 30;
}

async function enriquecerFalladas(
  falladas: PreguntaFallada[],
): Promise<PreguntaFallada[]> {
  if (!falladas.length) return falladas;
  try {
    const map = await getLocalCache().getFalladaMetaMap();
    return falladas.map((f) => {
      const meta = map.get(f.preguntaId);
      return {
        ...f,
        repasada: meta?.repasada ?? false,
        fechaRepaso: meta?.fechaRepaso ?? null,
      };
    });
  } catch {
    return falladas;
  }
}

/** La caché local puede no tener todos los bancos; el servidor manda en el nombre. */
function conNombresDelServidor(
  bancos: BancoCacheEntry[],
  nombres?: Record<string, string>,
): BancoCacheEntry[] {
  if (!nombres) return bancos;
  const vistos = new Set<string>();
  const out = bancos.map((b) => {
    vistos.add(b.id);
    const nombre = nombres[b.id];
    return nombre ? { ...b, nombre } : b;
  });
  for (const [id, nombre] of Object.entries(nombres)) {
    if (!vistos.has(id) && nombre) {
      out.push({ id, nombre, tipo: "", materiaId: "", cachedAt: "" });
    }
  }
  return out;
}

/** Función principal del dashboard. */
export async function obtenerDashboardData(
  filtro: FiltroTiempo = "30dias",
  bancosVigentes?: ReadonlySet<string>,
  bancoNombres?: Record<string, string>,
): Promise<DashboardData> {
  const cache = getLocalCache();
  const resultados = await getResultadosFromCache();
  const filtrados = filtrarPorFecha(resultados, filtro);
  const bancos = conNombresDelServidor(
    await cache.getBancos().catch(() => [] as BancoCacheEntry[]),
    bancoNombres,
  );
  const diasEvo = diasParaEvolucion(filtro);
  const evolucion = calcularEvolucionDiaria(filtrados, diasEvo);
  const resumen = calcularResumen(filtrados);
  const rendimientoBancos = calcularRendimientoPorBanco(filtrados, bancos);

  return {
    resumen,
    evolucion,
    mediaPeriodo:
      resumen.testsCompletados > 0 ? resumen.aciertosGlobal : null,
    rendimientoBancos,
    tiempoMedioBancos: calcularTiempoMedioPorBanco(filtrados, bancos),
    preguntasFalladas: await enriquecerFalladas(
      obtenerPreguntasMasFalladas(filtrados, 10, bancos),
    ),
    fallosPorBanco: calcularFallosAgregadosPorBanco(filtrados, bancos),
    testsRecientes: obtenerTestsRecientes(filtrados, 50, bancos),
    recomendacion: generarRecomendacion(
      bancosVigentes
        ? rendimientoBancos.filter((b) => bancosVigentes.has(b.banco))
        : rendimientoBancos,
      filtrados,
    ),
    totalHistorial: resultados.length,
    totalPeriodo: filtrados.length,
  };
}

export const EstadisticasService = {
  obtenerDashboardData,
  obtenerEstadisticasResumen,
  calcularResumen,
  calcularEvolucionDiaria,
  calcularRendimientoPorBanco,
  calcularTiempoMedioPorBanco,
  generarRecomendacion,
  obtenerPreguntasMasFalladas,
  calcularFallosAgregadosPorBanco,
  obtenerTestsRecientes,
  getResultadosFromCache,
  filtrarPorFecha,
};
