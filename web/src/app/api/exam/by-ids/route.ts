import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { supuestosSchemaReady } from "@/lib/queries/schema";
import type { PublicExamPregunta } from "@/lib/exam-utils";

export const runtime = "nodejs";

/** POST { ids: string[] } → preguntas públicas (sin respuesta) para repaso. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map((id: unknown) => String(id)).filter(Boolean))]
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "Falta ids" }, { status: 400 });
    }
    if (ids.length > 80) {
      return NextResponse.json({ error: "Demasiados ids" }, { status: 400 });
    }

    const withSupuesto = await supuestosSchemaReady();
    const supabase = getSupabase();
    const select = withSupuesto
      ? "id, banco_id, enunciado, opciones, orden, supuesto_id"
      : "id, banco_id, enunciado, opciones, orden";

    const { data, error } = await supabase.from("preguntas").select(select).in("id", ids);
    if (error) throw new Error(error.message);

    const byId = new Map((data ?? []).map((p) => [p.id as string, p]));
    const list: PublicExamPregunta[] = [];

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) continue;
      const opciones = Array.isArray(row.opciones)
        ? (row.opciones as string[])
        : [];
      list.push({
        id: row.id as string,
        bancoId: row.banco_id as string,
        enunciado: row.enunciado as string,
        opciones,
        orden: (row.orden as number) ?? 0,
        supuestoId: withSupuesto
          ? ((row as { supuesto_id?: string | null }).supuesto_id ?? null)
          : null,
      });
    }

    return NextResponse.json({ preguntas: list });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar preguntas" },
      { status: 500 },
    );
  }
}
