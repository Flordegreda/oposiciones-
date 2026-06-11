import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: banco, error: bErr } = await supabase
      .from("bancos")
      .select("id, nombre, tipo, materia_id, linea_id, active")
      .eq("id", id)
      .single();

    if (bErr || !banco) {
      return NextResponse.json({ error: "Banco no encontrado" }, { status: 404 });
    }

    const { data: preguntas, error: pErr } = await supabase
      .from("preguntas")
      .select("enunciado, opciones, respuesta, explicacion, orden")
      .eq("banco_id", id)
      .order("orden");

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const { data: nuevo, error: nErr } = await supabase
      .from("bancos")
      .insert({
        nombre: `${banco.nombre} (copia)`,
        tipo: banco.tipo,
        materia_id: banco.materia_id,
        linea_id: banco.linea_id,
        active: banco.active ?? true,
      })
      .select("id")
      .single();

    if (nErr || !nuevo) {
      return NextResponse.json({ error: nErr?.message ?? "Error al duplicar" }, { status: 500 });
    }

    if (preguntas?.length) {
      const rows = preguntas.map((p) => ({
        banco_id: nuevo.id,
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuesta: p.respuesta,
        explicacion: p.explicacion,
        orden: p.orden,
      }));
      const { error: insErr } = await supabase.from("preguntas").insert(rows);
      if (insErr) {
        await supabase.from("bancos").delete().eq("id", nuevo.id);
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ id: nuevo.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
