import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { runImport, type BackupBody, type ImportMode } from "@/lib/import-backup";
import { preguntasTableExists } from "@/lib/queries/schema";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BackupBody & { mode?: ImportMode };
    const mode: ImportMode = body.mode === "overwrite" ? "overwrite" : "append";
    const materias = body.materias;

    if (!Array.isArray(materias) || !materias.length) {
      return NextResponse.json(
        { error: "JSON inválido: falta el array materias" },
        { status: 400 },
      );
    }

    if (!(await preguntasTableExists())) {
      return NextResponse.json(
        { error: "Falta la tabla preguntas. Configura la base de datos primero." },
        { status: 400 },
      );
    }

    const result = await runImport(body, mode);
    revalidateContentCache();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al importar" },
      { status: 500 },
    );
  }
}
