import { NextRequest, NextResponse } from "next/server";
import { mergeBancosByIds } from "@/lib/merge-bancos";
import { planBankRenames } from "@/lib/normalize-bank-name";
import { revalidateAllCaches, revalidateAppPaths } from "@/lib/revalidate-content";
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

    const merged = [];
    for (const conflict of conflicts) {
      try {
        merged.push(
          await mergeBancosByIds(supabase, conflict.ids, conflict.name),
        );
      } catch (e) {
        errors.push({
          id: conflict.ids.join(","),
          from: conflict.from.join(" | "),
          error: e instanceof Error ? e.message : "Error al fusionar duplicados",
        });
      }
    }

    if (updated > 0 || merged.length > 0) {
      revalidateAllCaches();
      revalidateAppPaths();
    }

    return NextResponse.json({
      dryRun: false,
      total: bancos?.length ?? 0,
      updated,
      merged,
      unchanged: unchanged.length,
      conflicts: conflicts.length,
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
