import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateAllCaches } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("FICHAS.sql", dbPassword);
    revalidateAllCaches();

    return NextResponse.json({
      message:
        "Fichas activadas. Recarga la página e importa mazos en la pestaña Fichas.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar fichas" },
      { status: 500 },
    );
  }
}
