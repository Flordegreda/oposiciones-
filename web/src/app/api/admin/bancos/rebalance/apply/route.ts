import { NextRequest, NextResponse } from "next/server";
import { executeRebalance } from "@/lib/rebalance-bancos";
import { revalidateContentCache } from "@/lib/revalidate-content";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      materiaId?: string | null;
      targetSize?: number;
    };

    const targetSize = body.targetSize ?? 50;
    const preview = await executeRebalance({
      materiaId: body.materiaId ?? null,
      targetSize: Number.isFinite(targetSize) && targetSize > 0 ? targetSize : 50,
    });

    revalidateContentCache();

    return NextResponse.json({
      message: "Bancos reequilibrados",
      preview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al reequilibrar" },
      { status: 500 },
    );
  }
}
