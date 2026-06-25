import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabase();

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const { linea_id } = body;
      const { error } = await supabase
        .from("bancos")
        .update({ linea_id: linea_id ?? null })
        .in("id", body.ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      revalidateContentCache();
      return NextResponse.json({ ok: true, updated: body.ids.length });
    }

    const { id, active, linea_id, nombre, tipo, materia_id } = body;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof active === "boolean") patch.active = active;
    if (linea_id !== undefined) patch.linea_id = linea_id;
    if (typeof nombre === "string" && nombre.trim()) patch.nombre = nombre.trim();
    if (typeof tipo === "string" && tipo.trim()) patch.tipo = tipo.trim();
    if (typeof materia_id === "string" && materia_id) patch.materia_id = materia_id;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bancos")
      .update(patch)
      .eq("id", id)
      .select("id, nombre, active, linea_id")
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
