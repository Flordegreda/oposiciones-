import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { deleteResumenFile } from "@/lib/resumenes-storage";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { id: resumenId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json({ error: "Resúmenes PDF no activados" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const materiaId = String(body.materiaId ?? "").trim();
  const storagePath = String(body.path ?? "").trim();
  const filename = String(body.filename ?? "resumen.pdf").trim() || "resumen.pdf";
  const titulo = String(body.titulo ?? filename.replace(/\.pdf$/i, "")).trim();
  const size = Number(body.size ?? 0);

  if (!materiaId || !storagePath.startsWith(`${materiaId}/`)) {
    return NextResponse.json({ error: "Ruta de almacenamiento inválida" }, { status: 400 });
  }
  if (!storagePath.endsWith(`/${resumenId}.pdf`)) {
    return NextResponse.json({ error: "El id del resumen no coincide con la ruta" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Tamaño inválido" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("materia_resumenes").insert({
    id: resumenId,
    materia_id: materiaId,
    titulo,
    storage_path: storagePath,
    filename,
    size_bytes: Math.round(size),
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({ ok: true, id: resumenId, titulo, sizeBytes: Math.round(size) });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id: resumenId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json({ error: "Resúmenes PDF no activados" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const titulo = String(body.titulo ?? "").trim();
  if (!titulo) {
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("materia_resumenes")
    .update({ titulo, updated_at: new Date().toISOString() })
    .eq("id", resumenId)
    .select("id, titulo")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Resumen no encontrado" }, { status: 404 });

  revalidateContentCache();
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id: resumenId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json({ error: "Resúmenes PDF no activados" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: row, error: gErr } = await supabase
    .from("materia_resumenes")
    .select("storage_path")
    .eq("id", resumenId)
    .maybeSingle();

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Resumen no encontrado" }, { status: 404 });

  try {
    await deleteResumenFile(row.storage_path);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al borrar el archivo" },
      { status: 500 },
    );
  }

  const { error } = await supabase.from("materia_resumenes").delete().eq("id", resumenId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({ ok: true });
}
