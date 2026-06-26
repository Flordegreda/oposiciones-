import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 25 * 1024 * 1024;

type ParsedPdf = {
  fileName: string;
  pages: number;
  chars: number;
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form
      .getAll("files")
      .filter((v): v is File => v instanceof File && v.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "No se recibieron PDFs" }, { status: 400 });
    }

    const { default: pdfParse } = await import("pdf-parse");

    const parsedInfo: ParsedPdf[] = [];
    const chunks: string[] = [];

    for (const file of files) {
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return NextResponse.json(
          { error: `Archivo no válido: ${file.name}. Solo PDF.` },
          { status: 400 },
        );
      }

      if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json(
          {
            error: `El archivo ${file.name} supera 25 MB. Divídelo en archivos más pequeños.`,
          },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const out = await pdfParse(buffer);
      const text = (out.text ?? "").trim();

      if (text) {
        chunks.push(text);
      }

      parsedInfo.push({
        fileName: file.name,
        pages: out.numpages ?? 0,
        chars: text.length,
      });
    }

    const combined = chunks.join("\n\n");
    if (!combined.trim()) {
      return NextResponse.json(
        {
          error:
            "No se pudo extraer texto de los PDFs. Si son escaneados, necesitas OCR previo.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      text: combined,
      files: parsedInfo,
      totalChars: combined.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error extrayendo PDF" },
      { status: 500 },
    );
  }
}
