import { NextRequest, NextResponse } from "next/server";
import { getPrintBundleForMateria } from "@/lib/queries/bancos";

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
    return NextResponse.json(bundle);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar material" },
      { status: 500 },
    );
  }
}
