import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { getJexLineaId } from "@/lib/queries/bancos";
import type { ParsedQuestion } from "@/lib/parse-import-text";

type Body = {
  materiaId?: string;
  tipo?: "teorico" | "practico";
  nombre?: string;
  preguntas?: ParsedQuestion[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { materiaId, tipo, nombre, preguntas } = body;

    if (!materiaId || !preguntas?.length) {
      return NextResponse.json(
        { error: "Faltan materia o preguntas" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const jexId = await getJexLineaId();

    const bancoNombre =
      nombre?.trim() ||
      `Banco ${new Date().toLocaleDateString("es-ES")} (${preguntas.length})`;

    const { data: banco, error: bErr } = await supabase
      .from("bancos")
      .insert({
        nombre: bancoNombre,
        tipo: tipo ?? "teorico",
        active: true,
        materia_id: materiaId,
        linea_id: jexId,
      })
      .select("id, nombre")
      .single();

    if (bErr || !banco) {
      return NextResponse.json(
        { error: bErr?.message ?? "Error al crear banco" },
        { status: 500 },
      );
    }

    const rows = preguntas.map((p, orden) => ({
      banco_id: banco.id,
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta: p.respuesta,
      orden,
    }));

    const { error: pErr } = await supabase.from("preguntas").insert(rows);
    if (pErr) {
      await supabase.from("bancos").delete().eq("id", banco.id);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    revalidateContentCache();
    return NextResponse.json({ banco, num: preguntas.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
