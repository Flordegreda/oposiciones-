import { NextRequest, NextResponse } from "next/server";
import { planBankRenames } from "@/lib/normalize-bank-name";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;

    const supabase = getSupabase();
    const { data: bancos, error } = await supabase
      .from("bancos")
      .select("id, nombre")
      .order("nombre");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { plans, unchanged, conflicts } = planBankRenames(bancos ?? []);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        total: bancos?.length ?? 0,
        toUpdate: plans.length,
        unchanged: unchanged.length,
        conflicts,
        plans,
      });
    }

    if (conflicts.length) {
      return NextResponse.json(
        {
          error:
            "Hay nombres duplicados tras normalizar. Revisa conflictos en dryRun.",
          conflicts,
          updated: 0,
        },
        { status: 409 },
      );
    }

    let updated = 0;
    const errors: Array<{ id: string; from: string; error: string }> = [];

    for (const plan of plans) {
      const { error: updateError } = await supabase
        .from("bancos")
        .update({ nombre: plan.to })
        .eq("id", plan.id);

      if (updateError) {
        errors.push({ id: plan.id, from: plan.from, error: updateError.message });
      } else {
        updated++;
      }
    }

    if (updated > 0) {
      revalidateContentCache();
    }

    return NextResponse.json({
      dryRun: false,
      total: bancos?.length ?? 0,
      updated,
      unchanged: unchanged.length,
      errors,
      plans,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al normalizar nombres" },
      { status: 500 },
    );
  }
}
