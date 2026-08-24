import { NextRequest, NextResponse } from "next/server";
import { previewRebalanceFichas } from "@/lib/rebalance-fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!(await fichasSchemaReady())) {
      return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
    }

    const materiaId = req.nextUrl.searchParams.get("materiaId");
    const targetSize = Number(req.nextUrl.searchParams.get("targetSize") ?? 50);

    const preview = await previewRebalanceFichas({
      materiaId: materiaId || null,
      targetSize,
    });

    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al previsualizar" },
      { status: 500 },
    );
  }
}
