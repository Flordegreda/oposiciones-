import { NextRequest, NextResponse } from "next/server";
import { getFichasByMateria } from "@/lib/queries/fichas";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { materiaFichasReady } from "@/lib/queries/schema";

export async function GET(req: NextRequest) {
  const materiaId = req.nextUrl.searchParams.get("materiaId");
  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }
  if (!(await materiaFichasReady())) {
    return NextResponse.json({ fichas: [] });
  }
  try {
    const fichas = await getFichasByMateria(materiaId);
    return NextResponse.json({ fichas });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al listar fichas" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (!(await materiaFichasReady())) {
    return NextResponse.json({ error: "Fichas por tema no activadas" }, { status: 400 });
  }
  const supabase = getSupabase();
  const { error } = await supabase.from("materia_fichas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateContentCache();
  return NextResponse.json({ ok: true });
}
