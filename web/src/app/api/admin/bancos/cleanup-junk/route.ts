import { NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { findJunkBancoIds } from "@/lib/queries/bancos";
import { getSupabase } from "@/lib/supabase/server";
import { preguntasTableExists } from "@/lib/queries/schema";

export async function GET() {
  try {
    if (!(await preguntasTableExists())) {
      return NextResponse.json({ error: "Falta tabla preguntas" }, { status: 503 });
    }
    const junk = await findJunkBancoIds(1);
    return NextResponse.json({
      count: junk.length,
      stubs: junk.filter((j) => j.reason === "stub").length,
      duplicates: junk.filter((j) => j.reason === "duplicate").length,
      items: junk,
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

    const junk = await findJunkBancoIds(1);
    if (!junk.length) {
      return NextResponse.json({ deleted: 0, items: [] });
    }

    const supabase = getSupabase();
    const ids = junk.map((j) => j.id);
    const { error: dErr } = await supabase.from("bancos").delete().in("id", ids);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    revalidateContentCache();
    return NextResponse.json({ deleted: junk.length, items: junk });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
