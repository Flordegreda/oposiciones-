import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateSchemaCache } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("RESUMENES-PDF.sql", dbPassword);
    revalidateSchemaCache();

    return NextResponse.json({
      message:
        "Resúmenes PDF activados. Recarga la página y sube un PDF en cualquier materia.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar resúmenes PDF" },
      { status: 500 },
    );
  }
}
