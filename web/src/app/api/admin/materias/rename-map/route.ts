import { NextRequest, NextResponse } from "next/server";
import {
  MATERIA_RENAME_MAP,
  planMateriaRenames,
  summarizeMateriaRenamePlan,
} from "@/lib/materia-rename-map";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("materias").select("id, nombre").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = planMateriaRenames(data ?? []);
  return NextResponse.json({
    mapa: MATERIA_RENAME_MAP.length,
    resumen: summarizeMateriaRenamePlan(plan),
    plan,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.confirm) {
    return NextResponse.json(
      { error: "Falta confirm: true para aplicar los renombres" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from("materias").select("id, nombre").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = planMateriaRenames(data ?? []);
  const toApply = plan.filter((p) => p.estado === "ok" && p.id);

  if (plan.some((p) => p.estado === "conflicto")) {
    return NextResponse.json(
      {
        error: "Hay conflictos de nombre. Revisa la previsualización antes de aplicar.",
        plan,
      },
      { status: 409 },
    );
  }

  const applied: { id: string; de: string; a: string }[] = [];
  const errors: string[] = [];

  for (const row of toApply) {
    const { error: uErr } = await supabase
      .from("materias")
      .update({ nombre: row.nuevo })
      .eq("id", row.id);
    if (uErr) {
      errors.push(`«${row.actual}»: ${uErr.message}`);
      continue;
    }
    applied.push({ id: row.id, de: row.actual, a: row.nuevo });
  }

  if (applied.length) revalidateContentCache();

  return NextResponse.json({
    ok: errors.length === 0,
    applied: applied.length,
    cambios: applied,
    errors,
    resumen: summarizeMateriaRenamePlan(plan),
  });
}
