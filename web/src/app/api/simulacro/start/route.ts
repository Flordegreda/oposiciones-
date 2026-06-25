import { NextRequest, NextResponse } from "next/server";
import type { SimulacroPresetId } from "@/lib/exam-utils";
import { SIMULACRO_PRESETS, stripExamAnswers } from "@/lib/exam-utils";
import { startSimulacroSession } from "@/lib/queries/simulacro";

export async function POST(req: NextRequest) {
  let body: { presetId?: string; materiaId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const presetId = body.presetId as SimulacroPresetId | undefined;
  if (!presetId || !SIMULACRO_PRESETS.some((p) => p.id === presetId)) {
    return NextResponse.json({ error: "presetId inválido" }, { status: 400 });
  }

  try {
    const session = await startSimulacroSession(presetId, body.materiaId ?? null);
    return NextResponse.json({
      ...session,
      list: stripExamAnswers(session.list),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al iniciar simulacro" },
      { status: 400 },
    );
  }
}
