import { NextRequest, NextResponse } from "next/server";
import { repairEncadenadoBancos } from "@/lib/repair-encadenados";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombres = Array.isArray(body.nombres)
      ? (body.nombres as string[]).filter(Boolean)
      : undefined;
    const texto = typeof body.texto === "string" ? body.texto : undefined;

    const results = await repairEncadenadoBancos({ nombres, texto });
    const ok = results.filter((r) => r.status === "ok").length;

    return NextResponse.json({
      ok,
      total: results.length,
      results,
      message:
        ok > 0
          ? `Reparados ${ok} banco(s) encadenado(s). Revisa el texto del supuesto en cada banco.`
          : "No había bancos encadenado pendientes de reparar.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al reparar encadenados" },
      { status: 500 },
    );
  }
}
