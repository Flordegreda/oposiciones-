import { getSupabase } from "@/lib/supabase/server";

export type GradedAnswer = {
  id: string;
  bancoId: string;
  respuesta: number;
  explicacion?: string;
  correct: boolean;
};

type GradeInput = { id: string; selected: number | null };

/** Quita sufijo de duplicado de sesión de repaso (`uuid__dup1`). */
function realPreguntaId(sessionId: string): string {
  return sessionId.replace(/__dup\d+$/, "");
}

export async function gradeExamAnswers(items: GradeInput[]): Promise<GradedAnswer[]> {
  if (!items.length) return [];

  const ids = [...new Set(items.map((i) => realPreguntaId(i.id)))];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("preguntas")
    .select("id, banco_id, respuesta, explicacion")
    .in("id", ids);

  if (error) throw error;

  const byId = new Map((data ?? []).map((p) => [p.id as string, p]));

  return items.map((item) => {
    const realId = realPreguntaId(item.id);
    const row = byId.get(realId);
    if (!row) {
      throw new Error(`Pregunta no encontrada: ${realId}`);
    }
    const respuesta = row.respuesta as number;
    const correct = item.selected !== null && item.selected === respuesta;
    return {
      id: item.id,
      bancoId: row.banco_id as string,
      respuesta,
      explicacion: (row.explicacion as string | null) ?? undefined,
      correct,
    };
  });
}

export async function checkSingleAnswer(
  id: string,
  selected: number,
): Promise<GradedAnswer> {
  const [result] = await gradeExamAnswers([{ id, selected }]);
  if (!result) throw new Error("Pregunta no encontrada");
  return result;
}
