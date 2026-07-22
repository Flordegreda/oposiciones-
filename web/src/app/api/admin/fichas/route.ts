import { NextRequest, NextResponse } from "next/server";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { parseFichasText } from "@/lib/parse-fichas-text";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

export async function GET() {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id, active, created_at, materias(nombre)")
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json(
      { error: "Activa fichas con la tarjeta amarilla de Material" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const materiaId = String(body.materiaId ?? "").trim();
  const nombre = String(body.nombre ?? "").trim();
  const texto = String(body.texto ?? "");
  const replace = Boolean(body.replace);

  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }
  if (!nombre) {
    return NextResponse.json({ error: "Nombre del mazo requerido" }, { status: 400 });
  }

  const parsed = parseFichasText(texto);
  if (!parsed.length) {
    return NextResponse.json(
      {
        error:
          "No se detectaron fichas. Usa P:/R:, Q:/A:, «Respuesta:», o frente :: dorso.",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id")
    .eq("id", materiaId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!materia) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  let mazoId = String(body.mazoId ?? "").trim();

  if (mazoId) {
    const { data: existing, error: eErr } = await supabase
      .from("mazos_fichas")
      .select("id")
      .eq("id", mazoId)
      .maybeSingle();
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Mazo no encontrado" }, { status: 404 });

    await supabase
      .from("mazos_fichas")
      .update({ nombre, materia_id: materiaId, updated_at: new Date().toISOString() })
      .eq("id", mazoId);

    if (replace) {
      const { error: delErr } = await supabase.from("fichas").delete().eq("mazo_id", mazoId);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  } else {
    const { data: created, error: cErr } = await supabase
      .from("mazos_fichas")
      .insert({ materia_id: materiaId, nombre, active: true })
      .select("id")
      .single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    mazoId = created.id as string;
  }

  let ordenBase = 0;
  if (!replace) {
    const { data: maxRow } = await supabase
      .from("fichas")
      .select("orden")
      .eq("mazo_id", mazoId)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();
    ordenBase = (maxRow?.orden as number | undefined) ?? 0;
    if (maxRow) ordenBase += 1;
  }

  const rows = parsed.map((f, i) => ({
    mazo_id: mazoId,
    frente: f.frente,
    dorso: f.dorso,
    orden: ordenBase + i,
  }));

  const { error: insErr } = await supabase.from("fichas").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  revalidateContentCache();

  return NextResponse.json({
    mazoId,
    imported: rows.length,
    message: `Mazo «${nombre}»: ${rows.length} ficha${rows.length !== 1 ? "s" : ""} importada${rows.length !== 1 ? "s" : ""}.`,
  });
}
