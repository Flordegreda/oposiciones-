import { NextRequest, NextResponse } from "next/server";
import { previewImport, type BackupBody, type ImportMode } from "@/lib/import-backup";
import { preguntasTableExists } from "@/lib/queries/schema";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BackupBody & { mode?: ImportMode };
    const mode: ImportMode = body.mode === "overwrite" ? "overwrite" : "append";

    if (!Array.isArray(body.materias) || !body.materias.length) {
      return NextResponse.json({ error: "JSON inválido: falta el array materias" }, { status: 400 });
    }

    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta la tabla preguntas" }, { status: 400 });
    }

    const preview = await previewImport(body, mode);
    return NextResponse.json({ preview, mode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al analizar" },
      { status: 500 },
    );
  }
}
