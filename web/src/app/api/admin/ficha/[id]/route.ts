import { NextRequest, NextResponse } from "next/server";
import { revalidateAfterFichasChange } from "@/lib/revalidate-content";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.frente === "string") patch.frente = body.frente.trim();
  if (typeof body.dorso === "string") patch.dorso = body.dorso.trim();
  if (typeof body.orden === "number") patch.orden = body.orden;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }
  if (
    ("frente" in patch && patch.frente === "") ||
    ("dorso" in patch && patch.dorso === "")
  ) {
    return NextResponse.json({ error: "Frente y dorso no pueden quedar vacíos" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("fichas")
    .update(patch)
    .eq("id", id)
    .select("id, mazo_id, frente, dorso, orden")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateAfterFichasChange(data.mazo_id as string | undefined);
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = getSupabase();
  const { data: row } = await supabase.from("fichas").select("mazo_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("fichas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateAfterFichasChange(row?.mazo_id as string | undefined);
  return NextResponse.json({ ok: true });
}
