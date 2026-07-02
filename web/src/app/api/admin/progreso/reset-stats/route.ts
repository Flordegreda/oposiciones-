import { NextResponse } from "next/server";
import { resetProgresoStats } from "@/lib/queries/resultados";
import { resultadosTableExists } from "@/lib/queries/schema";

export async function POST() {
  try {
    if (!(await resultadosTableExists())) {
      return NextResponse.json({ error: "Falta tabla resultados" }, { status: 503 });
    }

    const result = await resetProgresoStats();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
