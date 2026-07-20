import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateSchemaCache } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("MATERIAS-RESUMEN.sql", dbPassword);
    revalidateSchemaCache();

    return NextResponse.json({
      message: "Columna resumen_md añadida a materias. Ya puedes importar fichas Word.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al aplicar esquema" },
      { status: 500 },
    );
  }
}
