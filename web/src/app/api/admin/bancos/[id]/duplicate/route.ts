import { NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { supuestosSchemaReady } from "@/lib/queries/schema";

type Params = { params: Promise<{ id: string }> };

const PAGE_SIZE = 1000;

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

    const withSupuestos = await supuestosSchemaReady();
    const supuestoIdMap = new Map<string, string>();

    const preguntas: {
      enunciado: string;
      opciones: unknown;
      respuesta: number;
      explicacion: string | null;
      orden: number;
      supuesto_id: string | null;
    }[] = [];

    if (withSupuestos) {
      const { data: supuestos, error: sErr } = await supabase
        .from("supuestos")
        .select("id, titulo, texto, orden")
        .eq("banco_id", id)
        .order("orden");

      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

      const { data: nuevoBancoPrep, error: nErr } = await supabase
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

      if (nErr || !nuevoBancoPrep) {
        return NextResponse.json({ error: nErr?.message ?? "Error al duplicar" }, { status: 500 });
      }

      for (const sup of supuestos ?? []) {
        const { data: nuevoSup, error: insErr } = await supabase
          .from("supuestos")
          .insert({
            banco_id: nuevoBancoPrep.id,
            titulo: sup.titulo,
            texto: sup.texto,
            orden: sup.orden,
          })
          .select("id")
          .single();
        if (insErr || !nuevoSup) {
          await supabase.from("bancos").delete().eq("id", nuevoBancoPrep.id);
          return NextResponse.json({ error: insErr?.message ?? "Error al copiar supuesto" }, { status: 500 });
        }
        supuestoIdMap.set(sup.id, nuevoSup.id);
      }

      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error: pErr } = await supabase
          .from("preguntas")
          .select("enunciado, opciones, respuesta, explicacion, orden, supuesto_id")
          .eq("banco_id", id)
          .order("orden")
          .range(from, from + PAGE_SIZE - 1);

        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
        if (!data?.length) break;
        preguntas.push(
          ...data.map((p) => ({
            ...p,
            supuesto_id: p.supuesto_id
              ? (supuestoIdMap.get(p.supuesto_id) ?? null)
              : null,
          })),
        );
        if (data.length < PAGE_SIZE) break;
      }

      if (preguntas.length) {
        for (let i = 0; i < preguntas.length; i += 500) {
          const chunk = preguntas.slice(i, i + 500).map((p) => ({
            banco_id: nuevoBancoPrep.id,
            enunciado: p.enunciado,
            opciones: p.opciones,
            respuesta: p.respuesta,
            explicacion: p.explicacion,
            orden: p.orden,
            supuesto_id: p.supuesto_id,
          }));
          const { error: insErr } = await supabase.from("preguntas").insert(chunk);
          if (insErr) {
            await supabase.from("bancos").delete().eq("id", nuevoBancoPrep.id);
            return NextResponse.json({ error: insErr.message }, { status: 500 });
          }
        }
      }

      revalidateContentCache();
      return NextResponse.json({ id: nuevoBancoPrep.id });
    }

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error: pErr } = await supabase
        .from("preguntas")
        .select("enunciado, opciones, respuesta, explicacion, orden")
        .eq("banco_id", id)
        .order("orden")
        .range(from, from + PAGE_SIZE - 1);

      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
      if (!data?.length) break;
      preguntas.push(...data.map((p) => ({ ...p, supuesto_id: null })));
      if (data.length < PAGE_SIZE) break;
    }

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

    if (preguntas.length) {
      for (let i = 0; i < preguntas.length; i += 500) {
        const chunk = preguntas.slice(i, i + 500).map((p) => ({
          banco_id: nuevo.id,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuesta: p.respuesta,
          explicacion: p.explicacion,
          orden: p.orden,
        }));
        const { error: insErr } = await supabase.from("preguntas").insert(chunk);
        if (insErr) {
          await supabase.from("bancos").delete().eq("id", nuevo.id);
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }
    }

    revalidateContentCache();
    return NextResponse.json({ id: nuevo.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
