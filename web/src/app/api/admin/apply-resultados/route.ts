import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateAllCaches, revalidateSchemaCache } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("RESULTADOS-TESTS.sql", dbPassword);
    revalidateSchemaCache();
    revalidateAllCaches();

    return NextResponse.json({
      message:
        "Tabla resultados_tests y vistas de estadísticas listas. Los tests se guardarán en local y se sincronizarán con la nube.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar resultados" },
      { status: 500 },
    );
  }
}
