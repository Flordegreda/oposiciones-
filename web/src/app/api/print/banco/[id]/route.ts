import { NextResponse } from "next/server";
import { getPrintBundleForBanco } from "@/lib/queries/bancos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  try {
    const bundle = await getPrintBundleForBanco(id);
    if (!bundle.totalPreguntas) {
      return NextResponse.json(
        { error: "Este banco no tiene preguntas para imprimir" },
        { status: 404 },
      );
    }
    return NextResponse.json(bundle);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar material" },
      { status: 500 },
    );
  }
}
