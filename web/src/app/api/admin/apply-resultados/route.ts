import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("RESULTADOS-FAVORITOS.sql", dbPassword);

    return NextResponse.json({
      message: "Tablas resultados y favoritos creadas. Historial y sync activos.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
