import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { buildFullBackup, buildMateriaBackup } from "@/lib/queries/export";
import { deleteResumenFiles } from "@/lib/resumenes-storage";
import { fetchStoragePathsForMateria } from "@/lib/queries/resumenes";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

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

  const { data, error } = await supabase.from("materias").select("id, nombre").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { nombre } = await req.json();
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materias")
    .insert({ nombre: nombre.trim() })
    .select("id, nombre")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const { nombre } = await req.json();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materias")
    .update({ nombre: nombre.trim() })
    .eq("id", id)
    .select("id, nombre")
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
  if (await resumenesSchemaReady()) {
    const paths = await fetchStoragePathsForMateria(id);
    if (paths.length) {
      try {
        await deleteResumenFiles(paths);
      } catch {
        /* ignore storage cleanup errors */
      }
    }
  }
  await supabase.from("bancos").delete().eq("materia_id", id);
  const { error } = await supabase.from("materias").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json({ bancosEliminados: count ?? 0 });
}
