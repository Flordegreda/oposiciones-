import { NextRequest, NextResponse } from "next/server";
import { runSqlFile } from "@/lib/db/postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dbPassword = body.dbPassword as string | undefined;

    await runSqlFile("SUPUESTOS.sql", dbPassword);

    return NextResponse.json({
      message: "Tabla supuestos creada y preguntas enlazadas. Recarga la página.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al configurar supuestos" },
      { status: 500 },
    );
  }
}
