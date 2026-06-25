import { NextRequest, NextResponse } from "next/server";
import { recordIntento } from "@/lib/queries/intentos";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bancoId, preguntaId, correcta, dudosa } = body;

    if (!bancoId || !preguntaId || typeof correcta !== "boolean") {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const result = await recordIntento(
      bancoId,
      preguntaId,
      correcta,
      Boolean(dudosa),
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
