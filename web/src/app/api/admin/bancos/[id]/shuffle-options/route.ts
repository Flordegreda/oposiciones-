import { NextResponse } from "next/server";
import { shuffleQuestionOptions } from "@/lib/exam-utils";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id: bancoId } = await ctx.params;
    const supabase = getSupabase();

    const { data: preguntas, error: gErr } = await supabase
      .from("preguntas")
      .select("id, opciones, respuesta")
      .eq("banco_id", bancoId)
      .order("orden");

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
    if (!preguntas?.length) {
      return NextResponse.json({ error: "El banco no tiene preguntas" }, { status: 400 });
    }

    let updated = 0;
    for (const p of preguntas) {
      const opciones = Array.isArray(p.opciones) ? (p.opciones as string[]) : [];
      const respuesta = typeof p.respuesta === "number" ? p.respuesta : 0;
      if (opciones.length < 2) continue;

      const shuffled = shuffleQuestionOptions(opciones, respuesta);
      const { error } = await supabase
        .from("preguntas")
        .update({ opciones: shuffled.opciones, respuesta: shuffled.respuesta })
        .eq("id", p.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      updated++;
    }

    revalidateContentCache();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al barajar opciones" },
      { status: 500 },
    );
  }
}
