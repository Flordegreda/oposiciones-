import type { ExamPregunta } from "@/lib/exam-utils";
import { getSupabase } from "@/lib/supabase/server";
import { resultadosTableExists } from "@/lib/queries/schema";

export type ResultadoTipo = "banco" | "simulacro" | "repaso" | "fallos" | "favoritos";

export type ResultadoDetalleItem = {
  preguntaId: string;
  bancoId: string;
  correcta: boolean;
  respuesta: number | null;
  dudosa: boolean;
  enunciado: string;
};

export type ResultadoRow = {
  id: string;
  tipo: ResultadoTipo;
  titulo: string;
  banco_id: string | null;
  total: number;
  respondidas: number;
  correctas: number;
  incorrectas: number;
  sin_responder: number;
  nota: number;
  porcentaje: number;
  tiempo_segundos: number | null;
  exam_mode: boolean;
  detalle: ResultadoDetalleItem[];
  created_at: string;
};

export type SaveResultadoInput = {
  tipo: ResultadoTipo;
  titulo: string;
  bancoId?: string | null;
  total: number;
  respondidas: number;
  correctas: number;
  incorrectas: number;
  sinResponder: number;
  nota: string;
  porcentaje: number;
  tiempoSegundos?: number | null;
  examMode: boolean;
  detalle: ResultadoDetalleItem[];
};

export async function saveResultado(input: SaveResultadoInput): Promise<ResultadoRow | null> {
  if (!(await resultadosTableExists())) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resultados")
    .insert({
      tipo: input.tipo,
      titulo: input.titulo,
      banco_id: input.bancoId ?? null,
      total: input.total,
      respondidas: input.respondidas,
      correctas: input.correctas,
      incorrectas: input.incorrectas,
      sin_responder: input.sinResponder,
      nota: Number.parseFloat(input.nota),
      porcentaje: input.porcentaje,
      tiempo_segundos: input.tiempoSegundos ?? null,
      exam_mode: input.examMode,
      detalle: [],
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ResultadoRow;
}

type ResultadoStatsRow = Pick<
  ResultadoRow,
  "tipo" | "porcentaje" | "nota" | "created_at" | "tiempo_segundos"
>;

async function listResultadosForStats(): Promise<ResultadoStatsRow[]> {
  if (!(await resultadosTableExists())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resultados")
    .select("tipo, porcentaje, nota, created_at, tiempo_segundos")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ResultadoStatsRow[];
}

export async function resetProgresoStats(): Promise<{ deleted: number; desde: string }> {
  if (!(await resultadosTableExists())) {
    throw new Error("Falta tabla resultados");
  }

  const supabase = getSupabase();
  const { data, error: countErr } = await supabase
    .from("resultados")
    .select("id");
  if (countErr) throw countErr;

  const deleted = data?.length ?? 0;
  if (deleted > 0) {
    const { error: delErr } = await supabase
      .from("resultados")
      .delete()
      .not("id", "is", null);
    if (delErr) throw delErr;
  }

  return { deleted, desde: new Date().toISOString() };
}

export async function listResultados(limit = 30): Promise<ResultadoRow[]> {
  if (!(await resultadosTableExists())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resultados")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ResultadoRow[];
}

export async function getResultado(id: string): Promise<ResultadoRow | null> {
  if (!(await resultadosTableExists())) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("resultados").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ResultadoRow) ?? null;
}

export async function getProgresoStats() {
  const rows = await listResultadosForStats();
  if (!rows.length) {
    return {
      totalSesiones: 0,
      mediaPorcentaje: 0,
      mediaNota: 0,
      porTipo: {} as Record<string, number>,
      semanal: emptyWeekly(),
      desde: null as string | null,
    };
  }

  let sumPct = 0;
  let sumNota = 0;
  const porTipo: Record<string, number> = {};

  for (const r of rows) {
    sumPct += r.porcentaje;
    sumNota += Number(r.nota);
    porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + 1;
  }

  return {
    totalSesiones: rows.length,
    mediaPorcentaje: Math.round(sumPct / rows.length),
    mediaNota: Number((sumNota / rows.length).toFixed(2)),
    porTipo,
    semanal: getWeeklyStats(rows),
    desde: rows[rows.length - 1]?.created_at ?? null,
  };
}

function emptyWeekly() {
  return {
    sesiones: 0,
    simulacros: 0,
    mediaPorcentaje: 0,
    minutos: 0,
  };
}

export function getWeeklyStats(
  rows: Pick<ResultadoRow, "porcentaje" | "created_at" | "tiempo_segundos" | "tipo">[],
) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo);

  if (!week.length) return emptyWeekly();

  let sumPct = 0;
  let minutos = 0;
  let simulacros = 0;

  for (const r of week) {
    sumPct += r.porcentaje;
    minutos += Math.round((r.tiempo_segundos ?? 0) / 60);
    if (r.tipo === "simulacro") simulacros++;
  }

  return {
    sesiones: week.length,
    simulacros,
    mediaPorcentaje: Math.round(sumPct / week.length),
    minutos,
  };
}

export function buildDetalle(
  preguntas: Pick<ExamPregunta, "id" | "bancoId" | "enunciado">[],
  answers: (number | null)[],
  flags: boolean[],
  answerMeta: Map<string, { respuesta: number }>,
): ResultadoDetalleItem[] {
  return preguntas.map((q, i) => {
    const key = answerMeta.get(q.id);
    const selected = answers[i];
    return {
      preguntaId: q.id,
      bancoId: q.bancoId,
      correcta:
        selected !== null && key !== undefined && selected === key.respuesta,
      respuesta: selected,
      dudosa: flags[i] ?? false,
      enunciado: q.enunciado.length > 300 ? `${q.enunciado.slice(0, 300)}…` : q.enunciado,
    };
  });
}
