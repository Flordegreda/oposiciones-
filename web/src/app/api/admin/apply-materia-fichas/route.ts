import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { migrateLegacyResumenesToFichas } from "@/lib/queries/fichas";
import { revalidateContentCache, revalidateSchemaCache } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("MATERIA-FICHAS.sql", dbPassword);
    revalidateSchemaCache();

    const migrated = await migrateLegacyResumenesToFichas();
    revalidateContentCache();

    return NextResponse.json({
      message:
        migrated > 0
          ? `Tabla materia_fichas creada. ${migrated} ficha(s) migrada(s) desde resúmenes antiguos.`
          : "Tabla materia_fichas creada. Ya puedes importar fichas por tema.",
      migrated,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al aplicar esquema" },
      { status: 500 },
    );
  }
}
