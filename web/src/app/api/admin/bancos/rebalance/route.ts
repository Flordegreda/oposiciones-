import { NextRequest, NextResponse } from "next/server";
import { previewRebalance } from "@/lib/rebalance-bancos";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const materiaId = req.nextUrl.searchParams.get("materiaId");
    const targetSize = Number(req.nextUrl.searchParams.get("targetSize") ?? 50);

    const preview = await previewRebalance({
      materiaId: materiaId || null,
      targetSize: Number.isFinite(targetSize) && targetSize > 0 ? targetSize : 50,
    });

    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al previsualizar" },
      { status: 500 },
    );
  }
}
