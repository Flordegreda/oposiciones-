import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateContentCache, revalidateSchemaCache } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("PREGUNTAS-COUNTS-RPC.sql", dbPassword);
    revalidateSchemaCache();
    revalidateContentCache();

    return NextResponse.json({
      message:
        "Optimización aplicada: conteo de preguntas por banco en una sola consulta. Material debería abrir más rápido.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al aplicar optimización" },
      { status: 500 },
    );
  }
}
