import { NextRequest, NextResponse } from "next/server";
import { executeRebalance } from "@/lib/rebalance-bancos";
import { findBrokenBancoIds } from "@/lib/queries/bancos";
import { getSupabase } from "@/lib/supabase/server";
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

    const broken = await findBrokenBancoIds();
    let cleanedBroken = 0;
    if (broken.length) {
      const supabase = getSupabase();
      const { error } = await supabase.from("bancos").delete().in(
        "id",
        broken.map((b) => b.id),
      );
      if (error) throw new Error(error.message);
      cleanedBroken = broken.length;
    }

    revalidateContentCache();

    return NextResponse.json({
      message:
        cleanedBroken > 0
          ? `Bancos reequilibrados. Eliminados ${cleanedBroken} banco(s) con enlace roto.`
          : "Bancos reequilibrados",
      cleanedBroken,
      preview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al reequilibrar" },
      { status: 500 },
    );
  }
}
