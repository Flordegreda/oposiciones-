import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { buildFullBackup, buildMateriaBackup } from "@/lib/queries/export";

export async function GET(req: NextRequest) {
  const exportAll = req.nextUrl.searchParams.get("export") === "all";
  const id = req.nextUrl.searchParams.get("id");
  const supabase = getSupabase();

  if (exportAll) {
    try {
      const backup = await buildFullBackup();
      return NextResponse.json(backup);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error al exportar" },
        { status: 500 },
      );
    }
  }

  if (id && req.nextUrl.searchParams.get("export") === "1") {
    try {
      const data = await buildMateriaBackup(id);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error al exportar" },
        { status: 500 },
      );
    }
  }

  if (id) {
    const { data, error } = await supabase
      .from("materias")
      .select("id, nombre, resumen_md")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase.from("materias").select("id, nombre, resumen_md").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, resumen_md } = body;
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const supabase = getSupabase();
  const insert: { nombre: string; resumen_md?: string | null } = { nombre: nombre.trim() };
  if (typeof resumen_md === "string") insert.resumen_md = resumen_md;
  const { data, error } = await supabase
    .from("materias")
    .insert(insert)
    .select("id, nombre, resumen_md")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const body = await req.json();
  const { nombre, resumen_md } = body;
  const patch: { nombre?: string; resumen_md?: string | null } = {};
  if (typeof nombre === "string") patch.nombre = nombre.trim();
  if (resumen_md === null || typeof resumen_md === "string") patch.resumen_md = resumen_md;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materias")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, resumen_md")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabase
    .from("bancos")
    .select("*", { count: "exact", head: true })
    .eq("materia_id", id);

  revalidateContentCache();
  return NextResponse.json({ ...data, bancos: count ?? 0 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const supabase = getSupabase();
  const { count } = await supabase
    .from("bancos")
    .select("*", { count: "exact", head: true })
    .eq("materia_id", id);
  await supabase.from("bancos").delete().eq("materia_id", id);
  const { error } = await supabase.from("materias").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json({ bancosEliminados: count ?? 0 });
}
