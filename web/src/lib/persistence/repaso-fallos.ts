/**
 * Modo Repaso de Fallos: seleccionar, mezclar y marcar preguntas falladas.
 */

import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import {
  getResultadosFromCache,
  obtenerPreguntasMasFalladas,
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
  if (!top.length) return [];

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
  // Por id real: si alguna aparición es correcta, cuenta como mejorada
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

/** Alias de arranque: navegar a la página de repaso (cliente). */
export function iniciarRepasoFallos(navigate: (href: string) => void): void {
  navigate("/repaso-fallos");
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
