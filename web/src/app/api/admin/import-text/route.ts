import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { countParsedQuestions, parseImportDocument } from "@/lib/parse-import-text";
import { getJexLineaId } from "@/lib/queries/bancos";
import { supuestosSchemaReady } from "@/lib/queries/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { materiaId, tipo, nombre, texto } = body;

    if (!materiaId || !texto?.trim()) {
      return NextResponse.json({ error: "Faltan materia o texto" }, { status: 400 });
    }

    const doc = parseImportDocument(texto);
    const total = countParsedQuestions(doc);
    if (!total) {
      return NextResponse.json(
        { error: "No se encontraron preguntas válidas. Revisa el formato." },
        { status: 400 },
      );
    }

    const bancoNombre =
      nombre?.trim() || `Banco ${new Date().toLocaleDateString("es-ES")} (${total})`;

    if (doc.supuestos.length > 0 && !(await supuestosSchemaReady())) {
      return NextResponse.json(
        {
          error:
            "El texto incluye supuestos pero falta la tabla. Ve a Material y pulsa «Activar supuestos».",
        },
        { status: 503 },
      );
    }

    const supabase = getSupabase();
    const jexId = await getJexLineaId();

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

    let orden = 0;
    const rows: {
      banco_id: string;
      enunciado: string;
      opciones: string[];
      respuesta: number;
      orden: number;
      supuesto_id?: string;
    }[] = [];

    for (const p of doc.sueltas) {
      rows.push({
        banco_id: banco.id,
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuesta: p.respuesta,
        orden: orden++,
      });
    }

    for (let sIdx = 0; sIdx < doc.supuestos.length; sIdx++) {
      const sup = doc.supuestos[sIdx];
      const { data: supuesto, error: sErr } = await supabase
        .from("supuestos")
        .insert({
          banco_id: banco.id,
          titulo: sup.titulo ?? null,
          texto: sup.texto,
          orden: sIdx,
        })
        .select("id")
        .single();

      if (sErr || !supuesto) {
        await supabase.from("bancos").delete().eq("id", banco.id);
        return NextResponse.json({ error: sErr?.message ?? "Error al crear supuesto" }, { status: 500 });
      }

      for (const p of sup.preguntas) {
        rows.push({
          banco_id: banco.id,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuesta: p.respuesta,
          orden: orden++,
          supuesto_id: supuesto.id,
        });
      }
    }

    const { error: pErr } = await supabase.from("preguntas").insert(rows);
    if (pErr) {
      await supabase.from("bancos").delete().eq("id", banco.id);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    revalidateContentCache();
    return NextResponse.json({
      banco,
      num: total,
      supuestos: doc.supuestos.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
