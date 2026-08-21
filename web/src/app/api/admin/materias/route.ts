import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { buildFullBackup, buildMateriaBackup } from "@/lib/queries/export";
import { getSupabase } from "@/lib/supabase/server";
import {
  compareMateriasByNombre,
  displayMateriaNombre,
  matchTemarioFolder,
} from "@/lib/temario-catalogo";

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
  return NextResponse.json(
    [...(data ?? [])].sort((a, b) => compareMateriasByNombre(a.nombre, b.nombre)),
  );
}

export async function POST(req: NextRequest) {
  const { nombre } = await req.json();
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const trimmed = String(nombre).trim();
  const supabase = getSupabase();
  const { data: existing, error: listError } = await supabase
    .from("materias")
    .select("id, nombre");
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const folder = matchTemarioFolder(trimmed);
  const canonical =
    folder && folder.orden !== 33 ? displayMateriaNombre(folder) : trimmed;
  const found = (existing ?? []).find((m) => {
    if (m.nombre === trimmed || m.nombre === canonical) return true;
    if (!folder || folder.orden === 33) return false;
    return matchTemarioFolder(m.nombre)?.orden === folder.orden;
  });
  if (found) {
    revalidateContentCache();
    return NextResponse.json(found);
  }

  let data;
  let error;
  if (folder && folder.orden !== 33) {
    const inserted = await supabase
      .from("materias")
      .insert({ nombre: canonical, orden: folder.orden })
      .select("id, nombre")
      .single();
    data = inserted.data;
    error = inserted.error;
    if (error && /orden/i.test(error.message)) {
      const retry = await supabase
        .from("materias")
        .insert({ nombre: canonical })
        .select("id, nombre")
        .single();
      data = retry.data;
      error = retry.error;
    }
  } else {
    const inserted = await supabase
      .from("materias")
      .insert({ nombre: canonical })
      .select("id, nombre")
      .single();
    data = inserted.data;
    error = inserted.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const { nombre } = await req.json();
  const trimmed = String(nombre ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const supabase = getSupabase();
  const folder = matchTemarioFolder(trimmed);
  const canonical =
    folder && folder.orden !== 33 ? displayMateriaNombre(folder) : trimmed;

  let data;
  let error;
  if (folder && folder.orden !== 33) {
    const withOrden = await supabase
      .from("materias")
      .update({ nombre: canonical, orden: folder.orden })
      .eq("id", id)
      .select("id, nombre")
      .single();
    data = withOrden.data;
    error = withOrden.error;
    if (error && /orden/i.test(error.message)) {
      const retry = await supabase
        .from("materias")
        .update({ nombre: canonical })
        .eq("id", id)
        .select("id, nombre")
        .single();
      data = retry.data;
      error = retry.error;
    }
  } else {
    const renamed = await supabase
      .from("materias")
      .update({ nombre: canonical })
      .eq("id", id)
      .select("id, nombre")
      .single();
    data = renamed.data;
    error = renamed.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabase
    .from("bancos")
    .select("id", { count: "exact", head: true })
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
    .select("id", { count: "exact", head: true })
    .eq("materia_id", id);
  await supabase.from("mazos_fichas").delete().eq("materia_id", id);
  await supabase.from("bancos").delete().eq("materia_id", id);
  const { error } = await supabase.from("materias").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json({ bancosEliminados: count ?? 0 });
}
