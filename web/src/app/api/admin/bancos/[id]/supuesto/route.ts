import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { supuestosSchemaReady } from "@/lib/queries/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!(await supuestosSchemaReady())) {
      return NextResponse.json({ supuestos: [] });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("supuestos")
      .select("id, titulo, texto, orden")
      .eq("banco_id", id)
      .order("orden");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ supuestos: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: bancoId } = await params;
    if (!(await supuestosSchemaReady())) {
      return NextResponse.json(
        { error: "Falta la tabla supuestos. Actívala en Material." },
        { status: 503 },
      );
    }

    const body = await req.json();
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : null;
    const texto = typeof body.texto === "string" ? body.texto.trim() : "";
    if (!texto) {
      return NextResponse.json({ error: "El texto del supuesto no puede estar vacío" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from("supuestos")
      .select("id")
      .eq("banco_id", bancoId)
      .order("orden")
      .limit(1)
      .maybeSingle();

    let supuestoId = existing?.id;
    if (supuestoId) {
      const { error } = await supabase
        .from("supuestos")
        .update({ titulo, texto })
        .eq("id", supuestoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { data: banco } = await supabase
        .from("bancos")
        .select("nombre")
        .eq("id", bancoId)
        .maybeSingle();

      const { data: nuevo, error } = await supabase
        .from("supuestos")
        .insert({
          banco_id: bancoId,
          titulo: titulo || banco?.nombre || null,
          texto,
          orden: 0,
        })
        .select("id")
        .single();

      if (error || !nuevo) {
        return NextResponse.json({ error: error?.message ?? "Error al crear supuesto" }, { status: 500 });
      }
      supuestoId = nuevo.id;

      await supabase
        .from("preguntas")
        .update({ supuesto_id: supuestoId })
        .eq("banco_id", bancoId)
        .is("supuesto_id", null);
    }

    revalidateContentCache();
    return NextResponse.json({ ok: true, supuestoId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
