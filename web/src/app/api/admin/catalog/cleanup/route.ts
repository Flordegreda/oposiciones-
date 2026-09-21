import { NextRequest, NextResponse } from "next/server";
import { planCatalogCleanup, summarizeCatalogPlan } from "@/lib/catalog-cleanup";
import { mergeBancosByIds } from "@/lib/merge-bancos";
import { fetchMazosFichas } from "@/lib/queries/fichas";
import { fetchPreguntaCountsByBanco } from "@/lib/queries/bancos";
import { revalidateAllCaches, revalidateAppPaths } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

async function buildPlan() {
  const supabase = getSupabase();
  const [materiasRes, mazos, bancosRes] = await Promise.all([
    supabase.from("materias").select("id, nombre").order("nombre"),
    fetchMazosFichas({ activeOnly: false }),
    supabase.from("bancos").select("id, nombre, materia_id"),
  ]);
  if (materiasRes.error) throw new Error(materiasRes.error.message);
  if (bancosRes.error) throw new Error(bancosRes.error.message);

  const bancos = bancosRes.data ?? [];
  const counts = await fetchPreguntaCountsByBanco(bancos.map((b) => b.id));

  return planCatalogCleanup({
    materias: materiasRes.data ?? [],
    mazos: mazos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      materiaId: m.materiaId,
      materiaNombre: m.materiaNombre,
      numFichas: m.numFichas,
    })),
    bancos: bancos.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      materiaId: b.materia_id,
      numPreguntas: counts.get(b.id) ?? 0,
    })),
  });
}

async function mergeMazos(keeperId: string, loserIds: string[]) {
  const supabase = getSupabase();
  const { data: maxRow } = await supabase
    .from("fichas")
    .select("orden")
    .eq("mazo_id", keeperId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  let orden = (maxRow?.orden as number | undefined) ?? 0;

  for (const loserId of loserIds) {
    const { data: rows, error } = await supabase
      .from("fichas")
      .select("id")
      .eq("mazo_id", loserId)
      .order("orden")
      .order("id");
    if (error) throw new Error(error.message);
    for (const row of rows ?? []) {
      orden += 1;
      const { error: uErr } = await supabase
        .from("fichas")
        .update({ mazo_id: keeperId, orden })
        .eq("id", row.id);
      if (uErr) throw new Error(uErr.message);
    }
    const { error: dErr } = await supabase.from("mazos_fichas").delete().eq("id", loserId);
    if (dErr) throw new Error(dErr.message);
  }
}

export async function GET() {
  try {
    const plan = await buildPlan();
    return NextResponse.json({ resumen: summarizeCatalogPlan(plan), plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al analizar el catálogo" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.confirm) {
    return NextResponse.json({ error: "Falta confirm: true" }, { status: 400 });
  }

  try {
    const plan = await buildPlan();
    const supabase = getSupabase();
    const errors: string[] = [];

    for (const r of plan.materiaRenames) {
      const { error } = await supabase.from("materias").update({ nombre: r.to }).eq("id", r.id);
      if (error) errors.push(`materia ${r.from}: ${error.message}`);
    }
    for (const r of plan.mazoRenames) {
      const { error } = await supabase
        .from("mazos_fichas")
        .update({ nombre: r.to, updated_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) errors.push(`mazo ${r.from}: ${error.message}`);
    }
    for (const r of plan.mazoMoves) {
      const { error } = await supabase
        .from("mazos_fichas")
        .update({ materia_id: r.toId, updated_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) errors.push(`mover ${r.nombre}: ${error.message}`);
    }
    for (const r of plan.mazoDeletes) {
      const { error } = await supabase.from("mazos_fichas").delete().eq("id", r.id);
      if (error) errors.push(`borrar mazo ${r.nombre}: ${error.message}`);
    }
    for (const m of plan.mazoMerges) {
      try {
        await mergeMazos(m.keeperId, m.loserIds);
      } catch (e) {
        errors.push(`fusionar mazo ${m.nombre}: ${e instanceof Error ? e.message : e}`);
      }
    }
    for (const r of plan.bancoRenames) {
      const { error } = await supabase.from("bancos").update({ nombre: r.to }).eq("id", r.id);
      if (error) errors.push(`banco ${r.from}: ${error.message}`);
    }
    const merged = [];
    for (const m of plan.bancoMerges) {
      try {
        merged.push(
          await mergeBancosByIds(supabase, [m.keeperId, ...m.loserIds], m.nombre),
        );
      } catch (e) {
        errors.push(`fusionar banco ${m.nombre}: ${e instanceof Error ? e.message : e}`);
      }
    }
    for (const r of plan.bancoDeletes) {
      const { error } = await supabase.from("bancos").delete().eq("id", r.id);
      if (error) errors.push(`borrar banco ${r.nombre}: ${error.message}`);
    }

    revalidateAllCaches();
    revalidateAppPaths();

    return NextResponse.json({
      ok: errors.length === 0,
      resumen: summarizeCatalogPlan(plan),
      merged,
      errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al limpiar el catálogo" },
      { status: 500 },
    );
  }
}
