import { NextRequest, NextResponse } from "next/server";
import { revalidateAfterFichasChange } from "@/lib/revalidate-content";
import {
  baseMazoNombre,
  FICHAS_MAX_POR_MAZO,
  mazoNombreParte,
  needsMazoSplit,
  splitIntoChunks,
} from "@/lib/split-fichas-mazo";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = getSupabase();

  const { data: mazo, error: mErr } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id")
    .eq("id", id)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!mazo) return NextResponse.json({ error: "Mazo no encontrado" }, { status: 404 });

  const { data: fichas, error: fErr } = await supabase
    .from("fichas")
    .select("id")
    .eq("mazo_id", id)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const rows = fichas ?? [];
  if (!needsMazoSplit(rows.length)) {
    return NextResponse.json(
      {
        error: `Este mazo tiene ${rows.length} fichas (máximo ${FICHAS_MAX_POR_MAZO} sin dividir).`,
      },
      { status: 400 },
    );
  }

  const chunks = splitIntoChunks(rows);
  const total = chunks.length;
  const base = baseMazoNombre(mazo.nombre as string);
  const now = new Date().toISOString();
  const createdIds: string[] = [id];

  const { error: updErr } = await supabase
    .from("mazos_fichas")
    .update({ nombre: mazoNombreParte(base, 1, total), updated_at: now })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let targetMazoId = id;

    if (i > 0) {
      const { data: created, error: cErr } = await supabase
        .from("mazos_fichas")
        .insert({
          materia_id: mazo.materia_id,
          nombre: mazoNombreParte(base, i + 1, total),
          active: true,
        })
        .select("id")
        .single();
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
      targetMazoId = created.id as string;
      createdIds.push(targetMazoId);
    }

    for (let j = 0; j < chunk.length; j++) {
      const { error: moveErr } = await supabase
        .from("fichas")
        .update({ mazo_id: targetMazoId, orden: j })
        .eq("id", chunk[j].id);
      if (moveErr) return NextResponse.json({ error: moveErr.message }, { status: 500 });
    }
  }

  for (const mazoId of createdIds) {
    revalidateAfterFichasChange(mazoId);
  }

  const sizes = chunks.map((c) => c.length).join(" + ");
  return NextResponse.json({
    ok: true,
    mazoIds: createdIds,
    mazosCreated: total - 1,
    message: `Mazo «${base}» dividido en ${total} partes (${sizes} fichas).`,
  });
}
