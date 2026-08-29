import { NextRequest, NextResponse } from "next/server";
import { revalidateAfterFichasChange } from "@/lib/revalidate-content";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = getSupabase();
  const { data: mazo, error: mErr } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id, materias(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!mazo) return NextResponse.json({ error: "Mazo no encontrado" }, { status: 404 });

  const fichas: { id: string; frente: string; dorso: string; orden: number | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fichas")
      .select("id, frente, dorso, orden")
      .eq("mazo_id", id)
      .order("orden", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;
    fichas.push(...(data as typeof fichas));
    if (data.length < pageSize) break;
  }

  const materiaRel = (mazo as { materias?: { nombre: string } | { nombre: string }[] }).materias;
  const materiaNombre = Array.isArray(materiaRel)
    ? materiaRel[0]?.nombre ?? ""
    : materiaRel?.nombre ?? "";

  return NextResponse.json({
    mazo: {
      id: mazo.id,
      nombre: mazo.nombre,
      materiaId: mazo.materia_id,
      materiaNombre,
    },
    fichas,
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = getSupabase();
  const { data: deleted, error } = await supabase
    .from("mazos_fichas")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deleted?.length) {
    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el mazo (permisos de base de datos). Ve a Material → Fichas → «Actualizar esquema fichas».",
      },
      { status: 403 },
    );
  }

  revalidateAfterFichasChange(id);
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

  revalidateAfterFichasChange(id);
  return NextResponse.json(data);
}
