import { NextRequest, NextResponse } from "next/server";
import { FICHAS_SCHEMA_SQL } from "@/lib/db/fichas-schema-sql";
import { runSql, runSqlFile } from "@/lib/db/postgres";
import { revalidateAllCaches } from "@/lib/revalidate-content";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    const sqlPath = path.join(process.cwd(), "supabase", "FICHAS.sql");
    if (fs.existsSync(sqlPath)) {
      await runSqlFile("FICHAS.sql", dbPassword);
    } else {
      await runSql(FICHAS_SCHEMA_SQL, dbPassword);
    }

    revalidateAllCaches();

    return NextResponse.json({
      message:
        "Esquema de fichas actualizado (tablas y permisos de escritura). Recarga la página.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar fichas" },
      { status: 500 },
    );
  }
}
