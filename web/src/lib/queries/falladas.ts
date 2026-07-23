import "server-only";

import { falladasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";
import type { PublicExamPregunta } from "@/lib/exam-utils";

export type ColaRepasoItem = {
  preguntaId: string;
  bancoId: string | null;
  motivo: "fallada" | "dudosa";
  veces: number;
  updatedAt: string;
};

export type ColaRepasoCounts = {
  total: number;
  falladas: number;
  dudosas: number;
};

function normalizeDeviceId(raw: string): string | null {
  const id = raw.trim();
  if (id.length < 8 || id.length > 80) return null;
  if (!/^[\w.-]+$/.test(id)) return null;
  return id;
}

export async function getColaCounts(dispositivoId: string): Promise<ColaRepasoCounts> {
  if (!(await falladasSchemaReady())) {
    return { total: 0, falladas: 0, dudosas: 0 };
  }
  const device = normalizeDeviceId(dispositivoId);
  if (!device) return { total: 0, falladas: 0, dudosas: 0 };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("cola_repaso")
    .select("motivo")
    .eq("dispositivo_id", device);

  if (error || !data) return { total: 0, falladas: 0, dudosas: 0 };

  let falladas = 0;
  let dudosas = 0;
  for (const row of data) {
    if (row.motivo === "dudosa") dudosas += 1;
    else falladas += 1;
  }
  return { total: data.length, falladas, dudosas };
}

export async function upsertColaItems(
  dispositivoId: string,
  items: { preguntaId: string; bancoId?: string | null; motivo: "fallada" | "dudosa" }[],
): Promise<number> {
  if (!(await falladasSchemaReady())) {
    throw new Error("Activa la cola de falladas en Material");
  }
  const device = normalizeDeviceId(dispositivoId);
  if (!device) throw new Error("dispositivoId inválido");
  if (!items.length) return 0;

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Leer existentes para incrementar veces
  const ids = [...new Set(items.map((i) => i.preguntaId))];
  const { data: existing } = await supabase
    .from("cola_repaso")
    .select("pregunta_id, veces, motivo")
    .eq("dispositivo_id", device)
    .in("pregunta_id", ids);

  const prev = new Map(
    (existing ?? []).map((r) => [
      r.pregunta_id as string,
      { veces: Number(r.veces) || 1, motivo: r.motivo as string },
    ]),
  );

  const rows = items.map((item) => {
    const old = prev.get(item.preguntaId);
    // fallada gana sobre dudosa si ya estaba
    const motivo =
      old?.motivo === "fallada" || item.motivo === "fallada" ? "fallada" : item.motivo;
    return {
      dispositivo_id: device,
      pregunta_id: item.preguntaId,
      banco_id: item.bancoId ?? null,
      motivo,
      veces: (old?.veces ?? 0) + 1,
      updated_at: now,
    };
  });

  const { error } = await supabase.from("cola_repaso").upsert(rows, {
    onConflict: "dispositivo_id,pregunta_id",
  });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function removeColaItems(
  dispositivoId: string,
  preguntaIds: string[],
): Promise<number> {
  if (!(await falladasSchemaReady())) return 0;
  const device = normalizeDeviceId(dispositivoId);
  if (!device || !preguntaIds.length) return 0;

  const supabase = getSupabase();
  const { error, count } = await supabase
    .from("cola_repaso")
    .delete({ count: "exact" })
    .eq("dispositivo_id", device)
    .in("pregunta_id", preguntaIds);

  if (error) throw new Error(error.message);
  return count ?? preguntaIds.length;
}

export async function fetchColaPreguntas(
  dispositivoId: string,
  limit = 80,
): Promise<PublicExamPregunta[]> {
  if (!(await falladasSchemaReady())) return [];
  const device = normalizeDeviceId(dispositivoId);
  if (!device) return [];

  const supabase = getSupabase();
  const { data: cola, error: cErr } = await supabase
    .from("cola_repaso")
    .select("pregunta_id, banco_id")
    .eq("dispositivo_id", device)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (cErr || !cola?.length) return [];

  const preguntaIds = cola.map((r) => r.pregunta_id as string);
  const { data: preguntas, error: pErr } = await supabase
    .from("preguntas")
    .select("id, banco_id, enunciado, opciones, orden, supuesto_id")
    .in("id", preguntaIds);

  if (pErr || !preguntas?.length) return [];

  const byId = new Map(preguntas.map((p) => [p.id as string, p]));
  const out: PublicExamPregunta[] = [];

  for (const row of cola) {
    const p = byId.get(row.pregunta_id as string);
    if (!p) continue;
    const opciones = Array.isArray(p.opciones) ? (p.opciones as string[]) : [];
    out.push({
      id: p.id as string,
      bancoId: (p.banco_id as string) || (row.banco_id as string) || "",
      enunciado: p.enunciado as string,
      opciones,
      orden: (p.orden as number) ?? 0,
      supuestoId: (p.supuesto_id as string | null) ?? null,
    });
  }

  return out;
}
