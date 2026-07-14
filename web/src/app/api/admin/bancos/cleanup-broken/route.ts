import { NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { findBrokenBancoIds } from "@/lib/queries/bancos";
import { getSupabase } from "@/lib/supabase/server";
import { getPreguntasCount, preguntasTableExists } from "@/lib/queries/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta tabla preguntas" }, { status: 503 });
    }

    const broken = await findBrokenBancoIds();
    return NextResponse.json({
      count: broken.length,
      empty: broken.filter((b) => b.reason === "empty").length,
      orphan: broken.filter((b) => b.reason === "orphan").length,
      items: broken,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta tabla preguntas" }, { status: 503 });
    }

    const broken = await findBrokenBancoIds();
    if (!broken.length) {
      return NextResponse.json({ deleted: 0, items: [] });
    }

    const totalPreguntas = await getPreguntasCount();
    if (totalPreguntas === null) {
      return NextResponse.json({ error: "No se pudo verificar el temario" }, { status: 500 });
    }

    const supabase = getSupabase();
    const ids = broken.map((b) => b.id);
    const { error: dErr } = await supabase.from("bancos").delete().in("id", ids);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    revalidateContentCache();
    return NextResponse.json({
      deleted: broken.length,
      empty: broken.filter((b) => b.reason === "empty").length,
      orphan: broken.filter((b) => b.reason === "orphan").length,
      items: broken,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
