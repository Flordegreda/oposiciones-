import { NextRequest, NextResponse } from "next/server";
import { getResultado, listResultados, saveResultado } from "@/lib/queries/resultados";
import { resultadosTableExists } from "@/lib/queries/schema";

export async function GET(req: NextRequest) {
  try {
    const ready = await resultadosTableExists();
    if (!ready) {
      return NextResponse.json({ ready: false, resultados: [] });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const row = await getResultado(id);
      if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ready: true, resultado: row });
    }

    const resultados = await listResultados(40);
    return NextResponse.json({ ready: true, resultados });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ready = await resultadosTableExists();
    if (!ready) {
      return NextResponse.json({ ok: false, reason: "tabla_resultados" }, { status: 503 });
    }

    const row = await saveResultado(body);
    return NextResponse.json({ ok: true, resultado: row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
