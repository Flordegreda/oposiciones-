import { NextRequest, NextResponse } from "next/server";
import { docxBufferToMarkdown } from "@/lib/docx-to-markdown";
import {
  parseTemaFromFilename,
  parseTemaFromMarkdown,
  parseTituloFromMarkdown,
} from "@/lib/ficha-utils";
import { upsertMateriaFicha } from "@/lib/queries/fichas";
import { materiaFichasReady, materiasResumenReady } from "@/lib/queries/schema";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const fichasOk = await materiaFichasReady();
  const resumenOk = await materiasResumenReady();
  if (!fichasOk && !resumenOk) {
    return NextResponse.json(
      {
        error:
          "Faltan tablas de fichas. Activa «Fichas por tema» en Material o aplica MATERIA-FICHAS.sql.",
      },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const materiaId = String(form.get("materiaId") ?? "").trim();
  const mode = String(form.get("mode") ?? "replace").trim();
  const temaOverride = String(form.get("temaNumero") ?? "").trim();
  const file = form.get("file");

  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo .docx" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Solo se admiten archivos .docx" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 5 MB" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id, nombre, resumen_md")
    .eq("id", materiaId)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!materia) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  let markdown: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    markdown = await docxBufferToMarkdown(buffer);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer el Word" },
      { status: 400 },
    );
  }

  if (!markdown.trim()) {
    return NextResponse.json({ error: "El Word no tiene texto legible" }, { status: 400 });
  }

  const temaNumero =
    (temaOverride ? parseInt(temaOverride, 10) : null) ||
    parseTemaFromFilename(file.name) ||
    parseTemaFromMarkdown(markdown);

  if (fichasOk && temaNumero) {
    const titulo = parseTituloFromMarkdown(markdown, temaNumero);
    const ficha = await upsertMateriaFicha({
      materiaId,
      temaNumero,
      titulo,
      resumenMd: markdown,
    });
    revalidateContentCache();
    return NextResponse.json({
      ...ficha,
      materia_nombre: materia.nombre,
      chars: markdown.length,
      perTema: true,
      replaced: mode !== "append",
    });
  }

  if (!resumenOk) {
    return NextResponse.json(
      {
        error:
          "No se detectó número de tema (usa Tema_37_….docx) y fichas por tema no están activas.",
      },
      { status: 400 },
    );
  }

  const existing = materia.resumen_md?.trim() ?? "";
  const resumen_md =
    mode === "append" && existing ? `${existing}\n\n---\n\n${markdown}` : markdown;

  const { data, error } = await supabase
    .from("materias")
    .update({ resumen_md })
    .eq("id", materiaId)
    .select("id, nombre, resumen_md")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({
    ...data,
    chars: resumen_md.length,
    appended: mode === "append" && !!existing,
    perTema: false,
  });
}
