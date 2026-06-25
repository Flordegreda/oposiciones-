import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabase();

    const patch: Record<string, unknown> = {};
    if (typeof body.enunciado === "string") patch.enunciado = body.enunciado.trim();
    if (Array.isArray(body.opciones)) patch.opciones = body.opciones;
    if (typeof body.respuesta === "number") patch.respuesta = body.respuesta;
    if (body.explicacion !== undefined) {
      patch.explicacion = body.explicacion?.trim() || null;
    }
    if (typeof body.orden === "number") patch.orden = body.orden;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("preguntas")
      .update(patch)
      .eq("id", id)
      .select("id, enunciado, opciones, respuesta, explicacion, orden")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateContentCache();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase.from("preguntas").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidateContentCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
