/**
 * Modo Repaso de Fallos: seleccionar, mezclar y marcar preguntas falladas.
 */

import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import {
  calcularFallosAgregadosPorBanco,
  getResultadosFromCache,
  obtenerPreguntasMasFalladas,
  UMBRAL_BANCO_CRITICO,
  type PreguntaFallada,
} from "@/lib/persistence/estadisticas-service";

export type PreguntaParaRepaso = {
  preguntaId: string;
  texto: string;
  banco: string;
  bancoNombre: string;
  fallos: number;
  /** true si se duplica por tener >5 fallos */
  duplicada: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Id real de pregunta (quita sufijo de duplicado en sesión). */
export function realPreguntaId(sessionId: string): string {
  return sessionId.replace(/__dup\d+$/, "");
}

export function sessionPreguntaId(preguntaId: string, dupIndex: number): string {
  return dupIndex > 0 ? `${preguntaId}__dup${dupIndex}` : preguntaId;
}

function poolDesdeFalladas(top: PreguntaFallada[]): PreguntaParaRepaso[] {
  const pool: PreguntaParaRepaso[] = [];
  for (const p of top) {
    const base: PreguntaParaRepaso = {
      preguntaId: p.preguntaId,
      texto: p.texto,
      banco: p.banco,
      bancoNombre: p.bancoNombre,
      fallos: p.fallos,
      duplicada: false,
    };
    pool.push(base);
    if (p.fallos > 5) {
      pool.push({ ...base, duplicada: true });
    }
  }
  return shuffle(pool);
}

/**
 * Obtiene preguntas para repaso desde la caché local.
 * - Top N más falladas
 * - Si fallos > 5, se incluye dos veces
 * - Orden aleatorio
 */
export async function obtenerPreguntasParaRepaso(
  limite = 10,
): Promise<PreguntaParaRepaso[]> {
  const resultados = await getResultadosFromCache();
  const bancos = await getLocalCache().getBancos().catch(() => []);
  const top = obtenerPreguntasMasFalladas(resultados, limite, bancos);
  return poolDesdeFalladas(top);
}

/** Top falladas de un banco concreto. */
export async function obtenerPreguntasParaRepasoBanco(
  bancoId: string,
  limite = 10,
): Promise<PreguntaParaRepaso[]> {
  const resultados = await getResultadosFromCache();
  const bancos = await getLocalCache().getBancos().catch(() => []);
  const top = obtenerPreguntasMasFalladas(resultados, limite, bancos, bancoId);
  return poolDesdeFalladas(top);
}

/** Falladas de todos los bancos con aciertos por debajo del umbral. */
export async function obtenerPreguntasParaRepasoCriticos(
  umbral = UMBRAL_BANCO_CRITICO,
  limitePorBanco = 10,
  maxTotal = 50,
): Promise<PreguntaParaRepaso[]> {
  const resultados = await getResultadosFromCache();
  const bancos = await getLocalCache().getBancos().catch(() => []);
  const agregados = calcularFallosAgregadosPorBanco(resultados, bancos).filter(
    (b) => b.porcentajeAciertos < umbral && b.totalFallidas > 0,
  );
  if (!agregados.length) return [];

  const seen = new Set<string>();
  const merged: PreguntaFallada[] = [];
  for (const row of agregados) {
    const top = obtenerPreguntasMasFalladas(
      resultados,
      limitePorBanco,
      bancos,
      row.banco,
    );
    for (const p of top) {
      if (seen.has(p.preguntaId)) continue;
      seen.add(p.preguntaId);
      merged.push(p);
      if (merged.length >= maxTotal) break;
    }
    if (merged.length >= maxTotal) break;
  }

  return poolDesdeFalladas(merged);
}

/**
 * Maratón: 50 preguntas aleatorias de TODAS las falladas (con repetición).
 */
export async function obtenerPreguntasParaMaraton(
  objetivo = 50,
): Promise<PreguntaParaRepaso[]> {
  const resultados = await getResultadosFromCache();
  const bancos = await getLocalCache().getBancos().catch(() => []);
  const todas = obtenerPreguntasMasFalladas(
    resultados,
    Number.MAX_SAFE_INTEGER,
    bancos,
  );
  if (!todas.length) return [];

  const seen = new Set<string>();
  const pool: PreguntaParaRepaso[] = [];
  for (let i = 0; i < objetivo; i++) {
    const p = todas[Math.floor(Math.random() * todas.length)]!;
    const duplicada = seen.has(p.preguntaId);
    seen.add(p.preguntaId);
    pool.push({
      preguntaId: p.preguntaId,
      texto: p.texto,
      banco: p.banco,
      bancoNombre: p.bancoNombre,
      fallos: p.fallos,
      duplicada,
    });
  }

  return shuffle(pool);
}

export type ModoRepaso = "top" | "maraton" | "banco" | "criticos";

export type RepasoQuery = {
  modo: ModoRepaso;
  bancoId?: string;
  bancoNombre?: string;
};

export async function obtenerPoolRepaso(query: RepasoQuery): Promise<{
  pool: PreguntaParaRepaso[];
  title: string;
  banner: string;
}> {
  switch (query.modo) {
    case "maraton": {
      const pool = await obtenerPreguntasParaMaraton(50);
      return {
        pool,
        title: "Maratón de fallos",
        banner: `🏃 Maratón de fallos: ${pool.length} preguntas aleatorias de todas tus falladas.`,
      };
    }
    case "banco": {
      const nombre = query.bancoNombre ?? "banco";
      const pool = await obtenerPreguntasParaRepasoBanco(query.bancoId ?? "", 10);
      const unicas = new Set(pool.map((p) => p.preguntaId)).size;
      return {
        pool,
        title: `Repaso — ${nombre}`,
        banner: `📝 Repasando fallos de ${nombre}: ${pool.length} pregunta${pool.length === 1 ? "" : "s"} (${unicas} única${unicas === 1 ? "" : "s"}).`,
      };
    }
    case "criticos": {
      const pool = await obtenerPreguntasParaRepasoCriticos();
      const unicas = new Set(pool.map((p) => p.preguntaId)).size;
      return {
        pool,
        title: "Repaso — bancos críticos",
        banner: `⚠️ Bancos con menos del ${UMBRAL_BANCO_CRITICO}% de aciertos: ${pool.length} pregunta${pool.length === 1 ? "" : "s"} (${unicas} única${unicas === 1 ? "" : "s"}).`,
      };
    }
    default: {
      const pool = await obtenerPreguntasParaRepaso(10);
      const unicas = new Set(pool.map((p) => p.preguntaId)).size;
      return {
        pool,
        title: "Repaso de fallos",
        banner: `📝 Repasando tus fallos: ${pool.length} pregunta${pool.length === 1 ? "" : "s"} (${unicas} única${unicas === 1 ? "" : "s"}).`,
      };
    }
  }
}

/** @deprecated Usar obtenerPoolRepaso */
export async function obtenerPoolSegunModo(
  modo: ModoRepaso,
): Promise<PreguntaParaRepaso[]> {
  const { pool } = await obtenerPoolRepaso({ modo });
  return pool;
}

export type RepasoStats = {
  total: number;
  acertadasAhora: number;
  mejoradas: number;
  siguenFallando: number;
};

/** Calcula mensajes de resultado del repaso. */
export function calcularStatsRepaso(
  detalle: {
    preguntaId: string;
    correcta: boolean;
    respondida: boolean;
  }[],
): RepasoStats {
  const byId = new Map<string, { ok: boolean; answered: boolean }>();
  for (const d of detalle) {
    const id = realPreguntaId(d.preguntaId);
    const prev = byId.get(id) ?? { ok: false, answered: false };
    if (d.respondida) {
      prev.answered = true;
      if (d.correcta) prev.ok = true;
    }
    byId.set(id, prev);
  }

  let acertadasAhora = 0;
  let siguenFallando = 0;
  let mejoradas = 0;
  for (const v of byId.values()) {
    if (!v.answered) {
      siguenFallando += 1;
      continue;
    }
    if (v.ok) {
      acertadasAhora += 1;
      mejoradas += 1;
    } else {
      siguenFallando += 1;
    }
  }

  return {
    total: byId.size,
    acertadasAhora,
    mejoradas,
    siguenFallando,
  };
}

export async function marcarRepasoCompletado(
  preguntaIds: string[],
): Promise<void> {
  const unique = [...new Set(preguntaIds.map(realPreguntaId))];
  await getLocalCache().markPreguntasRepasadas(unique);
  void getOrCreateUsuarioId();
}

export function iniciarRepasoFallos(navigate: (href: string) => void): void {
  navigate("/repaso-fallos");
}

export function iniciarMaratonFallos(navigate: (href: string) => void): void {
  navigate("/repaso-fallos?modo=maraton");
}

export function iniciarRepasoBanco(
  navigate: (href: string) => void,
  bancoId: string,
  bancoNombre: string,
): void {
  const q = new URLSearchParams({
    modo: "banco",
    banco: bancoId,
    nombre: bancoNombre,
  });
  navigate(`/repaso-fallos?${q}`);
}

export function iniciarRepasoCriticos(navigate: (href: string) => void): void {
  navigate("/repaso-fallos?modo=criticos");
}

export async function enriquecerFalladasConRepaso(
  falladas: PreguntaFallada[],
): Promise<(PreguntaFallada & { repasada: boolean; fechaRepaso: string | null })[]> {
  const map = await getLocalCache().getFalladaMetaMap();
  return falladas.map((f) => {
    const meta = map.get(f.preguntaId);
    return {
      ...f,
      repasada: meta?.repasada ?? false,
      fechaRepaso: meta?.fechaRepaso ?? null,
    };
  });
}
