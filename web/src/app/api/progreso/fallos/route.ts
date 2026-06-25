import { NextRequest, NextResponse } from "next/server";
import {
  getFalloPreguntas,
  getPendingFallos,
  recordIntento,
} from "@/lib/queries/intentos";
import { intentosTableExists } from "@/lib/queries/schema";
import { stripExamAnswers } from "@/lib/exam-utils";

export async function GET() {
  try {
    const ready = await intentosTableExists();
    if (!ready) {
      return NextResponse.json({
        ready: false,
        fallos: [],
        preguntas: [],
        count: 0,
      });
    }

    const fallos = await getPendingFallos();
    const preguntas = await getFalloPreguntas();

    return NextResponse.json({
      ready: true,
      fallos,
      preguntas: stripExamAnswers(preguntas),
      count: preguntas.length,
    });
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
    const items = body.intentos as
      | { bancoId: string; preguntaId: string; correcta: boolean; dudosa?: boolean }[]
      | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Falta array intentos" }, { status: 400 });
    }

    const ready = await intentosTableExists();
    if (!ready) {
      return NextResponse.json({ ok: false, reason: "tabla_intentos" }, { status: 503 });
    }

    let inserted = 0;
    for (const item of items) {
      if (!item.bancoId || !item.preguntaId || typeof item.correcta !== "boolean") {
        continue;
      }
      await recordIntento(
        item.bancoId,
        item.preguntaId,
        item.correcta,
        item.dudosa ?? false,
      );
      inserted++;
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
