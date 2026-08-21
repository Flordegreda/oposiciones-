import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { fichasSchemaReady, resultadosSchemaReady } from "@/lib/queries/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 1000;

async function fetchAll<T>(
  table: string,
  columns: string,
): Promise<T[]> {
  const supabase = getSupabase();
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Estadística agregable para la app de escritorio (solo lectura). */
export async function GET() {
  try {
    const bancos = await fetchAll<{ id: string; nombre: string; tipo: string }>(
      "bancos",
      "id, nombre, tipo",
    );

    let resultados: Array<{
      banco: string;
      test: string;
      fecha: string;
      total_preguntas: number;
      aciertos: number;
      fallos: number;
    }> = [];

    if (await resultadosSchemaReady()) {
      resultados = await fetchAll(
        "resultados_tests",
        "banco, test, fecha, total_preguntas, aciertos, fallos",
      );
    }

    let mazos: Array<{ id: string; nombre: string; materia: string }> = [];
    if (await fichasSchemaReady()) {
      const raw = await fetchAll<{
        id: string;
        nombre: string;
        materias: { nombre: string } | { nombre: string }[] | null;
      }>("mazos_fichas", "id, nombre, materias(nombre)");
      mazos = raw.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        materia: Array.isArray(r.materias)
          ? (r.materias[0]?.nombre ?? "")
          : (r.materias?.nombre ?? ""),
      }));
    }

    return NextResponse.json(
      { bancos, resultados, mazos },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al exportar estadística" },
      { status: 500 },
    );
  }
}
