import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  RESUMENES_BUCKET,
  resumenStoragePath,
} from "@/lib/resumenes-storage";
import { tituloFromFilename } from "@/lib/resumenes-client";
import { resumenesSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await resumenesSchemaReady())) {
    return NextResponse.json(
      { error: "Activa resúmenes PDF en la tarjeta amarilla de Material" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const materiaId = String(body.materiaId ?? "").trim();
  const filename = String(body.filename ?? "resumen.pdf").trim() || "resumen.pdf";
  const titulo = String(body.titulo ?? tituloFromFilename(filename)).trim() || tituloFromFilename(filename);
  const size = Number(body.size ?? 0);

  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }
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

  const resumenId = randomUUID();
  const path = resumenStoragePath(materiaId, resumenId);
  const { data, error } = await supabase.storage
    .from(RESUMENES_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    resumenId,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path ?? path,
    filename,
    titulo,
  });
}
