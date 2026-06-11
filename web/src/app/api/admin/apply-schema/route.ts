import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("APLICAR-AHORA.sql", dbPassword);

    return NextResponse.json({
      message:
        "Tabla preguntas creada. Recarga la página y vuelve a importar o editar bancos.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar" },
      { status: 500 },
    );
  }
}
