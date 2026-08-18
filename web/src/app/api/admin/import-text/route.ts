import { NextRequest, NextResponse } from "next/server";
import { deleteBancoContent } from "@/lib/import-backup";
import { revalidateBancoPaths } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { countParsedQuestions, parseImportForContext } from "@/lib/parse-import-text";
import type { ParsedImportDocument } from "@/lib/parse-import-text";
import { getJexLineaId } from "@/lib/queries/bancos";
import { supuestosSchemaReady } from "@/lib/queries/schema";

type ImportTextMode = "append" | "overwrite" | "create";

async function findBancoByName(materiaId: string, nombre: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre")
    .eq("materia_id", materiaId)
    .eq("nombre", nombre.trim())
    .order("nombre")
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function findBancoById(bancoId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre, materia_id")
    .eq("id", bancoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function nextPreguntaOrden(bancoId: string): Promise<number> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("preguntas")
    .select("orden")
    .eq("banco_id", bancoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.orden ?? -1) + 1;
}

async function resolveSupuestoId(
  bancoId: string,
  sup: ParsedImportDocument["supuestos"][number],
  sIdx: number,
): Promise<string> {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("supuestos")
    .select("id")
    .eq("banco_id", bancoId)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("supuestos")
      .update({
        titulo: sup.titulo ?? null,
        texto: sup.texto,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: supuesto, error: sErr } = await supabase
    .from("supuestos")
    .insert({
      banco_id: bancoId,
      titulo: sup.titulo ?? null,
      texto: sup.texto,
      orden: sIdx,
    })
    .select("id")
    .single();

  if (sErr || !supuesto) {
    throw new Error(sErr?.message ?? "Error al crear supuesto");
  }
  return supuesto.id;
}

async function insertParsedQuestions(bancoId: string, doc: ParsedImportDocument, startOrden = 0) {
  const supabase = getSupabase();
  let orden = startOrden;
  const rows: {
    banco_id: string;
    enunciado: string;
    opciones: string[];
    respuesta: number;
    explicacion?: string | null;
    orden: number;
    supuesto_id?: string;
  }[] = [];

  for (const p of doc.sueltas) {
    rows.push({
      banco_id: bancoId,
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta: p.respuesta,
      explicacion: p.explicacion ?? null,
      orden: orden++,
    });
  }

  for (let sIdx = 0; sIdx < doc.supuestos.length; sIdx++) {
    const sup = doc.supuestos[sIdx];
    const supuestoId = await resolveSupuestoId(bancoId, sup, sIdx);

    for (const p of sup.preguntas) {
      rows.push({
        banco_id: bancoId,
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuesta: p.respuesta,
        explicacion: p.explicacion ?? null,
        orden: orden++,
        supuesto_id: supuestoId,
      });
    }
  }

  if (!rows.length) return;

  const { error: pErr } = await supabase.from("preguntas").insert(rows);
  if (pErr) throw new Error(pErr.message);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      materiaId,
      tipo,
      nombre,
      texto,
      textoCaso,
      encadenado,
      mode: rawMode,
      bancoId: targetBancoId,
    } = body;
    const mode: ImportTextMode =
      rawMode === "overwrite" || rawMode === "create" || rawMode === "append"
        ? rawMode
        : "append";

    if (!materiaId || !texto?.trim()) {
      return NextResponse.json({ error: "Faltan materia o texto" }, { status: 400 });
    }

    const doc = parseImportForContext(texto, {
      encadenado: !!encadenado,
      nombre: nombre?.trim(),
      supuestoTexto: textoCaso?.trim(),
    });
    const total = countParsedQuestions(doc);
    if (!total) {
      return NextResponse.json(
        { error: "No se encontraron preguntas válidas. Revisa el formato." },
        { status: 400 },
      );
    }

    if (encadenado && doc.supuestos.length === 0) {
      return NextResponse.json(
        {
          error:
            "Supuesto práctico marcado pero falta el texto del caso o las preguntas. Usa las dos cajas.",
        },
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

    let existing: { id: string; nombre: string } | null = null;
    if (targetBancoId) {
      const byId = await findBancoById(String(targetBancoId));
      if (!byId) {
        return NextResponse.json({ error: "Banco no encontrado" }, { status: 404 });
      }
      if (byId.materia_id !== materiaId) {
        return NextResponse.json(
          { error: "El banco no pertenece a la materia seleccionada" },
          { status: 400 },
        );
      }
      existing = { id: byId.id, nombre: byId.nombre };
    } else if (mode !== "create") {
      existing = await findBancoByName(materiaId, bancoNombre);
    }

    let banco: { id: string; nombre: string };
    let action: "created" | "appended" | "overwritten";
    let note: string | undefined;

    if (existing && mode === "append") {
      banco = existing;
      action = "appended";
      const startOrden = await nextPreguntaOrden(existing.id);
      await insertParsedQuestions(existing.id, doc, startOrden);
    } else if (existing && mode === "overwrite") {
      banco = existing;
      action = "overwritten";
      await supabase
        .from("bancos")
        .update({ tipo: tipo ?? "teorico", active: true })
        .eq("id", existing.id);
      await deleteBancoContent(existing.id);
      await insertParsedQuestions(existing.id, doc, 0);
    } else {
      const { data: created, error: bErr } = await supabase
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

      if (bErr || !created) {
        return NextResponse.json(
          { error: bErr?.message ?? "Error al crear banco" },
          { status: 500 },
        );
      }

      banco = created;
      action = "created";
      if (mode === "append") {
        note =
          "No había un banco con ese nombre en esta materia; se ha creado uno nuevo. Para añadir a uno existente, usa el mismo nombre exacto.";
      }
      try {
        await insertParsedQuestions(created.id, doc, 0);
      } catch (e) {
        await supabase.from("bancos").delete().eq("id", created.id);
        throw e;
      }
    }

    revalidateBancoPaths(banco.id);
    return NextResponse.json({
      banco,
      num: total,
      supuestos: doc.supuestos.length,
      action,
      note,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
