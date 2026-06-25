import { getSupabase } from "@/lib/supabase/server";
import type { ExamPregunta } from "@/lib/exam-utils";
import { intentosTableExists } from "@/lib/queries/schema";

function bancoTipoFromMap(
  bancoId: string,
  tipos: Map<string, string>,
): "teorico" | "practico" {
  return tipos.get(bancoId) === "practico" ? "practico" : "teorico";
}

export type FalloRef = {
  preguntaId: string;
  bancoId: string;
};

export async function getPendingFallos(): Promise<FalloRef[]> {
  if (!(await intentosTableExists())) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("intentos")
    .select("pregunta_id, banco_id, correcta, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const latest = new Map<string, FalloRef & { correcta: boolean }>();
  for (const row of data ?? []) {
    if (latest.has(row.pregunta_id)) continue;
    latest.set(row.pregunta_id, {
      preguntaId: row.pregunta_id,
      bancoId: row.banco_id,
      correcta: row.correcta,
    });
  }

  return [...latest.values()]
    .filter((r) => !r.correcta)
    .map(({ preguntaId, bancoId }) => ({ preguntaId, bancoId }));
}

export async function getFalloPreguntas(): Promise<ExamPregunta[]> {
  const fallos = await getPendingFallos();
  if (!fallos.length) return [];

  const ids = fallos.map((f) => f.preguntaId);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("preguntas")
    .select("id, banco_id, enunciado, opciones, respuesta, explicacion, orden")
    .in("id", ids);

  if (error) throw error;

  const bancoIds = [...new Set((data ?? []).map((p) => p.banco_id))];
  const tipos = new Map<string, string>();
  if (bancoIds.length) {
    const { data: bancos, error: bErr } = await supabase
      .from("bancos")
      .select("id, tipo")
      .in("id", bancoIds);
    if (bErr) throw bErr;
    for (const b of bancos ?? []) tipos.set(b.id, b.tipo);
  }

  const byId = new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        bancoId: p.banco_id,
        tipo: bancoTipoFromMap(p.banco_id, tipos),
        enunciado: p.enunciado,
        opciones: p.opciones as string[],
        respuesta: p.respuesta,
        explicacion: p.explicacion ?? undefined,
      } satisfies ExamPregunta,
    ]),
  );

  const ordered: ExamPregunta[] = [];
  for (const f of fallos) {
    const p = byId.get(f.preguntaId);
    if (p) ordered.push(p);
  }
  return ordered;
}

export async function recordIntento(
  bancoId: string,
  preguntaId: string,
  correcta: boolean,
  dudosa = false,
) {
  if (!(await intentosTableExists())) {
    return { ok: false as const, reason: "tabla_intentos" as const };
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("intentos").insert({
    banco_id: bancoId,
    pregunta_id: preguntaId,
    correcta,
    dudosa,
  });

  if (error) throw error;
  return { ok: true as const };
}
