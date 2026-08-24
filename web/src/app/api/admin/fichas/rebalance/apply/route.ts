import { NextRequest, NextResponse } from "next/server";
import { executeRebalanceFichas } from "@/lib/rebalance-fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!(await fichasSchemaReady())) {
      return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      materiaId?: string | null;
      targetSize?: number;
    };

    const preview = await executeRebalanceFichas({
      materiaId: body.materiaId ?? null,
      targetSize: body.targetSize ?? 50,
    });

    return NextResponse.json({
      message:
        preview.partir > 0
          ? `Divididos ${preview.partir} mazo(s) en tandas de ~${preview.targetSize} fichas.`
          : "No había mazos que dividir.",
      preview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al dividir mazos" },
      { status: 500 },
    );
  }
}
