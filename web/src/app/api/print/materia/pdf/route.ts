import { NextRequest, NextResponse } from "next/server";
import { getPrintBundleForMateria } from "@/lib/queries/bancos";
import { parsePrintSearchParams } from "@/lib/print-url";
import { pdfFilename, pdfResponse, requestOrigin, urlToPdf } from "@/lib/print-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const materiaId = req.nextUrl.searchParams.get("materiaId");
  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }

  try {
    const bundle = await getPrintBundleForMateria(materiaId);
    if (!bundle.totalPreguntas) {
      return NextResponse.json(
        { error: "Esta materia no tiene preguntas para imprimir" },
        { status: 404 },
      );
    }

    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const opts = parsePrintSearchParams(sp);
    const qs = new URLSearchParams({ materiaId });
    if (opts.answerStyle === "inline") qs.set("style", "inline");
    if (opts.showExplanations) qs.set("explanations", "1");

    const origin = requestOrigin(req);
    const printUrl = `${origin}/imprimir/materia?${qs}`;
    const pdf = await urlToPdf(printUrl);

    return pdfResponse(pdf, pdfFilename(bundle.title));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar PDF" },
      { status: 500 },
    );
  }
}
