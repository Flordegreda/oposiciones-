import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from("mazos_fichas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.nombre === "string" && body.nombre.trim()) {
    patch.nombre = body.nombre.trim();
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }
  if (typeof body.materiaId === "string" && body.materiaId.trim()) {
    patch.materia_id = body.materiaId.trim();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mazos_fichas")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, materia_id, active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContentCache();
  return NextResponse.json(data);
}
