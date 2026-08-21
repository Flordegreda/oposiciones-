import { NextRequest, NextResponse } from "next/server";
import {
  applyTemarioRemap,
  fetchTemarioSnapshot,
  planTemarioRemap,
} from "@/lib/remap-temario";
import { revalidateAllCaches, revalidateAppPaths } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const dbPassword = typeof body.dbPassword === "string" ? body.dbPassword : undefined;
    const supabase = getSupabase();

    if (dryRun) {
      const snapshot = await fetchTemarioSnapshot(supabase);
      const plan = planTemarioRemap(snapshot);
      return NextResponse.json({
        dryRun: true,
        materias: snapshot.materias.length,
        bancos: snapshot.bancos.length,
        mazos: snapshot.mazos.length,
        create: plan.create.length,
        merge: plan.merge.length,
        delete: plan.delete.length,
        bancosAMover: plan.bancosAMover,
        mazosAMover: plan.mazosAMover,
        plan,
      });
    }

    const { plan, hasOrden } = await applyTemarioRemap(supabase, dbPassword);
    revalidateAllCaches();
    revalidateAppPaths();

    return NextResponse.json({
      dryRun: false,
      hasOrden,
      create: plan.create.length,
      merge: plan.merge.length,
      delete: plan.delete.length,
      bancosAMover: plan.bancosAMover,
      mazosAMover: plan.mazosAMover,
      message: "Temario reorganizado en 19 carpetas. Recarga Material, Tests y Plan.",
      plan,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al reorganizar el temario" },
      { status: 500 },
    );
  }
}
