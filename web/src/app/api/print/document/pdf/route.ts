import { NextResponse } from "next/server";
import type { PrintSection } from "@/lib/print-test";
import { buildPrintDocumentHtml } from "@/lib/print-html";
import { htmlToPdf, pdfFilename, pdfResponse } from "@/lib/print-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Body = {
  title: string;
  subtitle?: string;
  sections: PrintSection[];
  answerStyle?: "key-at-end" | "inline";
  showExplanations?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.title?.trim() || !body.sections?.length) {
      return NextResponse.json({ error: "Datos de impresión incompletos" }, { status: 400 });
    }

    const html = buildPrintDocumentHtml({
      title: body.title,
      subtitle: body.subtitle,
      sections: body.sections,
      answerStyle: body.answerStyle === "inline" ? "inline" : "key-at-end",
      showExplanations: !!body.showExplanations,
    });

    const pdf = await htmlToPdf(html);
    return pdfResponse(pdf, pdfFilename(body.title));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar PDF" },
      { status: 500 },
    );
  }
}
