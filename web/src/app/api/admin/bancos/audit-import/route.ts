import { NextResponse } from "next/server";
import { findImportGapBancos } from "@/lib/audit-import-gaps";
import { preguntasTableExists } from "@/lib/queries/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta tabla preguntas" }, { status: 503 });
    }

    const items = await findImportGapBancos();
    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
