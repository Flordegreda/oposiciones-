import { NextRequest, NextResponse } from "next/server";
import type { SimulacroPresetId } from "@/lib/exam-utils";
import { startSimulacroSession } from "@/lib/queries/simulacro";
import { parsePrintSearchParams } from "@/lib/print-url";
import { pdfFilename, pdfResponse, requestOrigin, urlToPdf } from "@/lib/print-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const presetId = (req.nextUrl.searchParams.get("presetId") ?? "oficial") as SimulacroPresetId;
  const materiaId = req.nextUrl.searchParams.get("materiaId");

  try {
    const session = await startSimulacroSession(presetId, materiaId);
    if (!session.list.length) {
      return NextResponse.json({ error: "No hay preguntas para el simulacro" }, { status: 404 });
    }

    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const opts = parsePrintSearchParams(sp);
    const qs = new URLSearchParams({ presetId });
    if (materiaId) qs.set("materiaId", materiaId);
    if (opts.answerStyle === "inline") qs.set("style", "inline");
    if (opts.showExplanations) qs.set("explanations", "1");

    const presetLabel = presetId === "oficial" ? "Simulacro_Oficial" : "Mini_Simulacro";
    const title = presetLabel + (session.materiaLabel ? `_${session.materiaLabel}` : "");

    const origin = requestOrigin(req);
    const printUrl = `${origin}/imprimir/simulacro?${qs}`;
    const pdf = await urlToPdf(printUrl);

    return pdfResponse(pdf, pdfFilename(title));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar PDF" },
      { status: 500 },
    );
  }
}
