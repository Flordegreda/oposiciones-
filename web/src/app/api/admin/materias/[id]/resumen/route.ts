import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import {
  RESUMENES_BUCKET,
  deleteResumenFile,
  resumenStoragePath,
} from "@/lib/resumenes-storage";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id: materiaId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json(
      { error: "Activa resúmenes PDF en la tarjeta amarilla de Material" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const filename = String(body.filename ?? "resumen.pdf").trim() || "resumen.pdf";
  const size = Number(body.size ?? 0);

  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Tamaño de archivo inválido" }, { status: 400 });
  }
  if (size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "El PDF no puede superar 50 MB" }, { status: 400 });
  }
  if (!filename.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Solo se admiten archivos PDF" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id")
    .eq("id", materiaId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!materia) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  const path = resumenStoragePath(materiaId);
  const { data, error } = await supabase.storage
    .from(RESUMENES_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path ?? path,
    filename,
  });
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { id: materiaId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json({ error: "Resúmenes PDF no activados" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const storagePath = String(body.path ?? "").trim();
  const filename = String(body.filename ?? "resumen.pdf").trim() || "resumen.pdf";
  const size = Number(body.size ?? 0);

  if (!storagePath.startsWith(`${materiaId}/`)) {
    return NextResponse.json({ error: "Ruta de almacenamiento inválida" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Tamaño inválido" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("materia_resumenes").upsert(
    {
      materia_id: materiaId,
      storage_path: storagePath,
      filename,
      size_bytes: Math.round(size),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "materia_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({ ok: true, filename, sizeBytes: Math.round(size) });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id: materiaId } = await ctx.params;
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json({ error: "Resúmenes PDF no activados" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: row, error: gErr } = await supabase
    .from("materia_resumenes")
    .select("storage_path")
    .eq("materia_id", materiaId)
    .maybeSingle();

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "No hay resumen PDF" }, { status: 404 });

  try {
    await deleteResumenFile(row.storage_path);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al borrar el archivo" },
      { status: 500 },
    );
  }

  const { error } = await supabase.from("materia_resumenes").delete().eq("materia_id", materiaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({ ok: true });
}
