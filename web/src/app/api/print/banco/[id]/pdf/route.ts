import { NextResponse } from "next/server";
import { getPrintBundleForBanco } from "@/lib/queries/bancos";
import { parsePrintSearchParams } from "@/lib/print-url";
import { pdfFilename, pdfResponse, requestOrigin, urlToPdf } from "@/lib/print-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;

  try {
    const bundle = await getPrintBundleForBanco(id);
    if (!bundle.totalPreguntas) {
      return NextResponse.json(
        { error: "Este banco no tiene preguntas para imprimir" },
        { status: 404 },
      );
    }

    const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
    const opts = parsePrintSearchParams(sp);
    const qs = new URLSearchParams();
    if (opts.answerStyle === "inline") qs.set("style", "inline");
    if (opts.showExplanations) qs.set("explanations", "1");

    const origin = requestOrigin(req);
    const printUrl = `${origin}/imprimir/banco/${id}${qs.size ? `?${qs}` : ""}`;
    const pdf = await urlToPdf(printUrl);

    return pdfResponse(pdf, pdfFilename(bundle.title));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar PDF" },
      { status: 500 },
    );
  }
}
