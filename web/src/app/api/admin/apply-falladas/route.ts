import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";
import { revalidateAllCaches } from "@/lib/revalidate-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("FALLADAS.sql", dbPassword);
    revalidateAllCaches();

    return NextResponse.json({
      message:
        "Cola de falladas activada. Los tests guardarán incorrectas y dudosas para repasar después.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar cola de falladas" },
      { status: 500 },
    );
  }
}
