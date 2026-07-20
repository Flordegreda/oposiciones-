import { NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { findEmptyBancoIds } from "@/lib/queries/bancos";
import { getSupabase } from "@/lib/supabase/server";
import { getPreguntasCount, preguntasTableExists } from "@/lib/queries/schema";

export async function POST() {
  try {
    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta tabla preguntas" }, { status: 503 });
    }

    const empty = await findEmptyBancoIds();
    if (!empty.length) {
      return NextResponse.json({ deleted: 0, names: [] });
    }

    const totalPreguntas = await getPreguntasCount();
    if (totalPreguntas === null) {
      return NextResponse.json({ error: "No se pudo verificar los bancos" }, { status: 500 });
    }

    const supabase = getSupabase();
    const ids = empty.map((b) => b.id);
    const { error: dErr } = await supabase.from("bancos").delete().in("id", ids);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    revalidateContentCache();
    return NextResponse.json({
      deleted: empty.length,
      names: empty.map((b) => b.nombre),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
