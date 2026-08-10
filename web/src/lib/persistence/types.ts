/** Tipos compartidos de persistencia híbrida (IndexedDB ↔ Supabase). */

export type SyncStatus = "pending" | "synced" | "error";

export type BancoCacheEntry = {
  id: string;
  nombre: string;
  tipo: string;
  materiaId: string;
  materiaNombre?: string;
  numPreguntas?: number;
  cachedAt: string;
};

/** Resultado de un test (local + nube). */
export type TestResultRecord = {
  id: string;
  usuarioId: string;
  /** Identificador del banco (UUID) o etiqueta ("simulacro" / "repaso_fallos"). */
  banco: string;
  /** Título mostrado (nombre del banco / preset). */
  test: string;
  fecha: string;
  totalPreguntas: number;
  aciertos: number;
  fallos: number;
  /** Segundos empleados; null si no hubo cronómetro. */
  tiempoTotal: number | null;
  /** pregunta_id → índice de opción elegida (null = sin responder). */
  respuestas: Record<string, number | null>;
  /** Detalle por pregunta (para TOP falladas / revisión). */
  detallePreguntas?: PreguntaResultadoDetalle[];
  /** Tipo de sesión (repaso vs test normal). */
  tipo?: "normal" | "repaso_fallos";
  /** Fuente de verdad para conflictos. */
  updatedAt: string;
  syncStatus: SyncStatus;
};

/** Meta local de preguntas falladas (repaso). */
export type FalladaMeta = {
  preguntaId: string;
  repasada: boolean;
  fechaRepaso: string | null;
  ultimoFallo?: string | null;
};

export type PreguntaResultadoDetalle = {
  preguntaId: string;
  enunciado: string;
  correcta: boolean;
  respondida: boolean;
  seleccion: number | null;
  respuestaCorrecta?: number;
  /** Banco real de la pregunta (UUID); útil en simulacro/repaso. */
  bancoId?: string;
};

export type BancoStatsSlice = {
  totalTests: number;
  totalAciertos: number;
  totalFallos: number;
  porcentajeAciertos: number;
  tiempoPromedio: number | null;
  ultimoTest: string | null;
};

export type DailyStat = {
  date: string;
  tests: number;
  aciertos: number;
  fallos: number;
};

export type UserStatsRecord = {
  usuarioId: string;
  byBanco: Record<string, BancoStatsSlice>;
  daily: DailyStat[];
  computedAt: string;
  updatedAt: string;
};

export type CacheMeta = {
  lastPullAt: string | null;
  lastPushAt: string | null;
  dirty: boolean;
};
