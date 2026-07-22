import { NextRequest, NextResponse } from "next/server";
import {
  analyzeAnswerDistribution,
  formatDistribution,
  planOptionRebalance,
} from "@/lib/answer-distribution";
import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const PAGE = 1000;

async function loadPreguntas(bancoId: string) {
  const supabase = getSupabase();
  const rows: {
    id: string;
    opciones: string[];
    respuesta: number;
  }[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("id, opciones, respuesta")
      .eq("banco_id", bancoId)
      .order("orden", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      rows.push({
        id: row.id as string,
        opciones: (row.opciones as string[]) ?? [],
        respuesta: Number(row.respuesta) || 0,
      });
    }
    if (data.length < PAGE) break;
  }

  return rows;
}

/** Diagnóstico de distribución A/B/C/D del banco. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const preguntas = await loadPreguntas(id);
    const dist = analyzeAnswerDistribution(preguntas);
    return NextResponse.json({
      bancoId: id,
      distribution: dist,
      summary: formatDistribution(dist),
      skewed: dist.skewed,
      dominantLetter: ["A", "B", "C", "D", "E", "F"][dist.dominant] ?? "?",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

/**
 * Reequilibra letras correctas en el banco (reordena opciones, no cambia textos).
 * Body opcional: { dryRun?: boolean }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);

    const preguntas = await loadPreguntas(id);
    if (!preguntas.length) {
      return NextResponse.json({ error: "Este banco no tiene preguntas" }, { status: 400 });
    }

    const before = analyzeAnswerDistribution(preguntas);
    const planned = planOptionRebalance(preguntas);
    const changed = planned.filter((p) => p.changed);

    if (dryRun) {
      const afterPreview = analyzeAnswerDistribution(
        planned.map((p) => ({ id: p.id, opciones: p.opciones, respuesta: p.respuesta })),
      );
      return NextResponse.json({
        dryRun: true,
        total: preguntas.length,
        wouldChange: changed.length,
        before: formatDistribution(before),
        after: formatDistribution(afterPreview),
        skewedBefore: before.skewed,
        skewedAfter: afterPreview.skewed,
      });
    }

    const supabase = getSupabase();
    let updated = 0;
    for (const p of changed) {
      const { error } = await supabase
        .from("preguntas")
        .update({ opciones: p.opciones, respuesta: p.respuesta })
        .eq("id", p.id);
      if (error) {
        return NextResponse.json(
          { error: `Error en pregunta ${p.id}: ${error.message}`, updated },
          { status: 500 },
        );
      }
      updated += 1;
    }

    const afterRows = planned.map((p) => ({
      id: p.id,
      opciones: p.opciones,
      respuesta: p.respuesta,
    }));
    const after = analyzeAnswerDistribution(afterRows);

    revalidateContentCache();

    return NextResponse.json({
      total: preguntas.length,
      updated,
      before: formatDistribution(before),
      after: formatDistribution(after),
      skewedBefore: before.skewed,
      skewedAfter: after.skewed,
      message: `Reequilibradas ${updated} de ${preguntas.length} preguntas.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
