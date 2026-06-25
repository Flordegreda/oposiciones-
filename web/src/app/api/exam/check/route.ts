import { NextResponse } from "next/server";
import { checkSingleAnswer } from "@/lib/queries/exam-grade";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; selected?: number };

    if (!body.id || typeof body.selected !== "number") {
      return NextResponse.json({ error: "Faltan id y selected" }, { status: 400 });
    }

    const result = await checkSingleAnswer(body.id, body.selected);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al corregir" },
      { status: 500 },
    );
  }
}
