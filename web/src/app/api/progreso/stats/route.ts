import { NextResponse } from "next/server";
import { getProgresoStats } from "@/lib/queries/resultados";
import { resultadosTableExists } from "@/lib/queries/schema";

export async function GET() {
  try {
    const ready = await resultadosTableExists();
    if (!ready) {
      return NextResponse.json({
        ready: false,
        totalSesiones: 0,
        mediaPorcentaje: 0,
        mediaNota: 0,
        recientes: [],
        desde: null,
        porTipo: {},
        semanal: { sesiones: 0, simulacros: 0, mediaPorcentaje: 0, minutos: 0 },
      });
    }

    const stats = await getProgresoStats();
    return NextResponse.json({ ready: true, ...stats });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
