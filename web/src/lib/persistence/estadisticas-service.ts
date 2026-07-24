/**
 * Cálculo de estadísticas del dashboard a partir de la caché local (IndexedDB).
 */

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
  tiempoPorTest: number | null;
  rachaActual: number;
};

export type PuntoEvolucion = {
  fecha: string;
  etiqueta: string;
  porcentajeAciertos: number | null;
  sinActividad: boolean;
};

export type RendimientoBanco = {
  banco: string;
  bancoNombre: string;
  porcentaje: number;
  totalTests: number;
  color: "verde" | "amarillo" | "rojo";
};

export type PreguntaFallada = {
  preguntaId: string;
  texto: string;
  fallos: number;
  totalApariciones: number;
  porcentajeFallos: number;
  banco: string;
  bancoNombre: string;
};

export type TestReciente = {
  id: string;
  banco: string;
  bancoNombre: string;
  test: string;
  aciertos: number;
  totalPreguntas: number;
  porcentaje: number;
  tiempoTotal: number | null;
  fecha: string;
  detallePreguntas?: PreguntaResultadoDetalle[];
};

export type DashboardData = {
  resumen: ResumenEstadisticas;
  evolucion: PuntoEvolucion[];
  rendimientoBancos: RendimientoBanco[];
  preguntasFalladas: PreguntaFallada[];
  testsRecientes: TestReciente[];
  /** Tests en todo el historial (sin filtro de fechas). */
  totalHistorial: number;
  /** Tests tras aplicar el filtro de periodo. */
  totalPeriodo: number;
};

const DETALLE_KEY = "__detalle";

export function embedDetalleInRespuestas(
  respuestas: Record<string, number | null>,
  detalle?: PreguntaResultadoDetalle[],
): Record<string, unknown> {
  if (!detalle?.length) return { ...respuestas };
  return { ...respuestas, [DETALLE_KEY]: detalle };
}

export function extractDetalleFromRespuestas(
  respuestas: Record<string, unknown> | null | undefined,
): {
  selecciones: Record<string, number | null>;
  detalle?: PreguntaResultadoDetalle[];
} {
  if (!respuestas || typeof respuestas !== "object") {
    return { selecciones: {} };
  }
  const selecciones: Record<string, number | null> = {};
  let detalle: PreguntaResultadoDetalle[] | undefined;
  for (const [k, v] of Object.entries(respuestas)) {
    if (k === DETALLE_KEY && Array.isArray(v)) {
      detalle = v as PreguntaResultadoDetalle[];
      continue;
    }
    selecciones[k] = typeof v === "number" || v === null ? (v as number | null) : null;
  }
  return { selecciones, detalle };
}

export async function getResultadosFromCache(): Promise<TestResultRecord[]> {
  const cache = getLocalCache();
  const usuarioId = getOrCreateUsuarioId();
  const all = await cache.getAllResultados();
  return all
    .filter((r) => r.usuarioId === usuarioId)
    .map(normalizeResultado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function normalizeResultado(r: TestResultRecord): TestResultRecord {
  if (r.detallePreguntas?.length) return r;
  const { selecciones, detalle } = extractDetalleFromRespuestas(
    r.respuestas as Record<string, unknown>,
  );
  return {
    ...r,
    respuestas: selecciones,
    detallePreguntas: detalle,
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

function dayKey(iso: string): string {
  return iso.slice(0, 10);
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
  const tiempos = resultados
    .map((r) => r.tiempoTotal)
    .filter((t): t is number => typeof t === "number" && t >= 0);

  return {
    testsCompletados,
    aciertosGlobal: totalPreguntas > 0 ? (totalAciertos / totalPreguntas) * 100 : 0,
    tiempoPorTest: tiempos.length
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
      : null,
    rachaActual: calcularRacha(resultados),
  };
}

export function calcularRacha(resultados: TestResultRecord[]): number {
  if (!resultados.length) return 0;
  const days = new Set(resultados.map((r) => dayKey(r.fecha)));
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());

  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  while (cursor && days.has(cursor)) {
    streak += 1;
    const prev = new Date(`${cursor}T12:00:00.000Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = dayKey(prev.toISOString());
  }
  return streak;
}

export function calcularEvolucionDiaria(
  resultados: TestResultRecord[],
  dias: number,
): PuntoEvolucion[] {
  const byDay = new Map<string, { aciertos: number; total: number }>();
  for (const r of resultados) {
    const k = dayKey(r.fecha);
    const cur = byDay.get(k) ?? { aciertos: 0, total: 0 };
    cur.aciertos += r.aciertos;
    cur.total += r.totalPreguntas;
    byDay.set(k, cur);
  }

  const out: PuntoEvolucion[] = [];
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = dayKey(d.toISOString());
    const hit = byDay.get(key);
    if (!hit || hit.total === 0) {
      out.push({
        fecha: key,
        etiqueta: labelDdMm(key),
        porcentajeAciertos: null,
        sinActividad: true,
      });
    } else {
      out.push({
        fecha: key,
        etiqueta: labelDdMm(key),
        porcentajeAciertos: (hit.aciertos / hit.total) * 100,
        sinActividad: false,
      });
    }
  }
  return out;
}

export function calcularRendimientoPorBanco(
  resultados: TestResultRecord[],
  bancos: BancoCacheEntry[] = [],
): RendimientoBanco[] {
  const map = new Map<
    string,
    { aciertos: number; total: number; tests: number; title: string }
  >();

  for (const r of resultados) {
    const cur = map.get(r.banco) ?? {
      aciertos: 0,
      total: 0,
      tests: 0,
      title: r.test,
    };
    cur.aciertos += r.aciertos;
    cur.total += r.totalPreguntas;
    cur.tests += 1;
    cur.title = r.test;
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
        color: colorPorPorcentaje(porcentaje),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

export function obtenerPreguntasMasFalladas(
  resultados: TestResultRecord[],
  limite: number,
  bancos: BancoCacheEntry[] = [],
): PreguntaFallada[] {
  const map = new Map<
    string,
    {
      texto: string;
      fallos: number;
      total: number;
      banco: string;
      title: string;
    }
  >();

  for (const r of resultados) {
    const detalle = r.detallePreguntas;
    if (!detalle?.length) continue;
    for (const d of detalle) {
      if (!d.respondida) continue;
      const cur = map.get(d.preguntaId) ?? {
        texto: d.enunciado,
        fallos: 0,
        total: 0,
        banco: r.banco,
        title: r.test,
      };
      cur.total += 1;
      if (!d.correcta) cur.fallos += 1;
      if (d.enunciado) cur.texto = d.enunciado;
      map.set(d.preguntaId, cur);
    }
  }

  return [...map.entries()]
    .filter(([, v]) => v.fallos > 0)
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

/** Función principal del dashboard. */
export async function obtenerDashboardData(
  filtro: FiltroTiempo = "30dias",
): Promise<DashboardData> {
  const cache = getLocalCache();
  const resultados = await getResultadosFromCache();
  const filtrados = filtrarPorFecha(resultados, filtro);
  const bancos = await cache.getBancos().catch(() => [] as BancoCacheEntry[]);
  const diasEvo = diasParaEvolucion(filtro);

  return {
    resumen: calcularResumen(filtrados),
    evolucion: calcularEvolucionDiaria(filtrados, diasEvo),
    rendimientoBancos: calcularRendimientoPorBanco(filtrados, bancos),
    preguntasFalladas: obtenerPreguntasMasFalladas(filtrados, 10, bancos),
    testsRecientes: obtenerTestsRecientes(filtrados, 50, bancos),
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
  obtenerPreguntasMasFalladas,
  obtenerTestsRecientes,
  getResultadosFromCache,
  filtrarPorFecha,
};
