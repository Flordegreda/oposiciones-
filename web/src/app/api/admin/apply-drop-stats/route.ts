import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("DROP-RESULTADOS.sql", dbPassword);
    await runSqlFile("DROP-PROGRESO.sql", dbPassword);

    return NextResponse.json({
      message:
        "Eliminadas tablas/vistas de resultados, estadísticas y progreso_preguntas.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Error al eliminar tablas de estadísticas",
      },
      { status: 500 },
    );
  }
}
