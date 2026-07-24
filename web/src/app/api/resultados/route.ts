import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { resultadosSchemaReady } from "@/lib/queries/schema";

export const runtime = "nodejs";

type IncomingResultado = {
  id?: string;
  usuario_id: string;
  banco: string;
  test: string;
  fecha?: string;
  total_preguntas: number;
  aciertos: number;
  fallos: number;
  tiempo_total?: number | null;
  respuestas?: Record<string, number | null> | null;
  updated_at?: string;
};

/** GET: resultados del usuario (opcional ?since=ISO para delta). */
export async function GET(req: NextRequest) {
  try {
    if (!(await resultadosSchemaReady())) {
      return NextResponse.json(
        { error: "Activa resultados_tests en Material", resultados: [] },
        { status: 503 },
      );
    }

    const usuarioId = req.nextUrl.searchParams.get("usuarioId");
    if (!usuarioId) {
      return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
    }

    const since = req.nextUrl.searchParams.get("since");
    const supabase = getSupabase();
    let query = supabase
      .from("resultados_tests")
      .select(
        "id, usuario_id, banco, test, fecha, total_preguntas, aciertos, fallos, tiempo_total, respuestas, updated_at",
      )
      .eq("usuario_id", usuarioId)
      .order("fecha", { ascending: false })
      .limit(500);

    if (since) {
      query = query.gt("updated_at", since);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ resultados: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al leer resultados" },
      { status: 500 },
    );
  }
}

/** POST: upsert de resultados (sync / beacon). Nube = verdad por updated_at. */
export async function POST(req: NextRequest) {
  try {
    if (!(await resultadosSchemaReady())) {
      return NextResponse.json(
        { error: "Activa resultados_tests en Material" },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rows = (body.resultados ?? body) as IncomingResultado[] | IncomingResultado;
    const list = Array.isArray(rows) ? rows : [rows];

    if (!list.length) {
      return NextResponse.json({ ok: true, upserted: 0 });
    }

    const supabase = getSupabase();
    const payload = list
      .filter((r) => r?.usuario_id && r.banco && r.test)
      .map((r) => ({
        id: r.id || undefined,
        usuario_id: r.usuario_id,
        banco: String(r.banco),
        test: String(r.test),
        fecha: r.fecha || new Date().toISOString(),
        total_preguntas: Number(r.total_preguntas) || 0,
        aciertos: Number(r.aciertos) || 0,
        fallos: Number(r.fallos) || 0,
        tiempo_total: r.tiempo_total ?? null,
        respuestas: r.respuestas ?? {},
        updated_at: r.updated_at || new Date().toISOString(),
      }));

    if (!payload.length) {
      return NextResponse.json({ error: "Sin filas válidas" }, { status: 400 });
    }

    // Evitar sobrescribir nube más reciente
    const ids = payload.map((p) => p.id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: existing } = await supabase
        .from("resultados_tests")
        .select("id, updated_at")
        .in("id", ids);
      const cloudTs = new Map(
        (existing ?? []).map((e) => [e.id as string, Date.parse(e.updated_at as string)]),
      );
      for (let i = payload.length - 1; i >= 0; i--) {
        const row = payload[i];
        if (!row.id) continue;
        const remote = cloudTs.get(row.id);
        const local = Date.parse(row.updated_at);
        if (remote !== undefined && remote > local) {
          payload.splice(i, 1);
        }
      }
    }

    if (!payload.length) {
      return NextResponse.json({ ok: true, upserted: 0, skipped: true });
    }

    const { error } = await supabase.from("resultados_tests").upsert(payload, {
      onConflict: "id",
    });
    if (error) throw new Error(error.message);

    // Refresco best-effort de vistas materializadas
    void supabase.rpc("refresh_estadisticas_usuario").then(() => undefined);

    return NextResponse.json({ ok: true, upserted: payload.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar resultados" },
      { status: 500 },
    );
  }
}
