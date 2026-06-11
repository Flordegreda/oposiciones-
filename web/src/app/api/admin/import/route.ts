import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { preguntasTableExists } from "@/lib/queries/schema";

type BackupPregunta = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string | null;
  orden?: number;
};

type BackupBanco = {
  id?: string;
  nombre: string;
  tipo?: string;
  active?: boolean;
  linea_id?: string | null;
  materia_id?: string;
  preguntas?: BackupPregunta[];
};

type BackupMateria = {
  id?: string;
  nombre: string;
  bancos?: BackupBanco[];
};

type BackupBody = {
  format?: string;
  materias?: BackupMateria[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BackupBody;
    const materias = body.materias;

    if (!Array.isArray(materias) || !materias.length) {
      return NextResponse.json(
        { error: "JSON inválido: falta el array materias" },
        { status: 400 },
      );
    }

    const hasPreguntas = await preguntasTableExists();
    if (!hasPreguntas) {
      return NextResponse.json(
        { error: "Falta la tabla preguntas. Configura la base de datos primero." },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    let inserted = 0;
    let skipped = 0;
    let materiasCreated = 0;

    for (const materia of materias) {
      if (!materia.nombre?.trim()) continue;

      let materiaId = materia.id;
      if (materiaId) {
        const { data } = await supabase
          .from("materias")
          .select("id")
          .eq("id", materiaId)
          .maybeSingle();
        if (!data) materiaId = undefined;
      }

      if (!materiaId) {
        const { data: byName } = await supabase
          .from("materias")
          .select("id")
          .eq("nombre", materia.nombre.trim())
          .maybeSingle();
        materiaId = byName?.id;
      }

      if (!materiaId) {
        const { data: created, error } = await supabase
          .from("materias")
          .insert({ nombre: materia.nombre.trim() })
          .select("id")
          .single();
        if (error || !created) {
          return NextResponse.json({ error: error?.message ?? "Error materia" }, { status: 500 });
        }
        materiaId = created.id;
        materiasCreated++;
      }

      for (const banco of materia.bancos ?? []) {
        if (!banco.nombre?.trim()) continue;

        if (banco.id) {
          const { data: exists } = await supabase
            .from("bancos")
            .select("id")
            .eq("id", banco.id)
            .maybeSingle();
          if (exists) {
            skipped++;
            continue;
          }
        } else {
          const { data: dup } = await supabase
            .from("bancos")
            .select("id")
            .eq("materia_id", materiaId)
            .eq("nombre", banco.nombre.trim())
            .maybeSingle();
          if (dup) {
            skipped++;
            continue;
          }
        }

        const { data: newBanco, error: bErr } = await supabase
          .from("bancos")
          .insert({
            nombre: banco.nombre.trim(),
            tipo: banco.tipo ?? "teorico",
            active: banco.active ?? true,
            linea_id: banco.linea_id ?? null,
            materia_id: materiaId,
          })
          .select("id")
          .single();

        if (bErr || !newBanco) {
          return NextResponse.json(
            { error: bErr?.message ?? "Error al crear banco" },
            { status: 500 },
          );
        }

        const rows = (banco.preguntas ?? []).map((p, orden) => ({
          banco_id: newBanco.id,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuesta: p.respuesta,
          explicacion: p.explicacion ?? null,
          orden: p.orden ?? orden,
        }));

        if (rows.length) {
          const { error: pErr } = await supabase.from("preguntas").insert(rows);
          if (pErr) {
            await supabase.from("bancos").delete().eq("id", newBanco.id);
            return NextResponse.json({ error: pErr.message }, { status: 500 });
          }
        }

        inserted++;
      }
    }

    return NextResponse.json({ inserted, skipped, materiasCreated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al importar" },
      { status: 500 },
    );
  }
}
