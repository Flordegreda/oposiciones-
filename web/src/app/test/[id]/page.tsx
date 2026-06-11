import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getSupabase } from "@/lib/supabase/server";
import { TestRunner } from "@/components/TestRunner";
import { isPreguntasTableMissing } from "@/lib/queries/schema";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TestPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let schemaMissing = false;
  let banco: { id: string; nombre: string } | null = null;
  let preguntas: {
    id: string;
    enunciado: string;
    opciones: string[];
    respuesta: number;
    explicacion?: string;
    orden: number;
  }[] = [];

  try {
    const supabase = getSupabase();

    const { data: bancoData, error: bErr } = await supabase
      .from("bancos")
      .select("id, nombre, materias(nombre)")
      .eq("id", id)
      .maybeSingle();

    if (bErr) throw bErr;
    if (!bancoData) notFound();
    banco = { id: bancoData.id, nombre: bancoData.nombre };

    const { data: pregData, error: pErr } = await supabase
      .from("preguntas")
      .select("id, enunciado, opciones, respuesta, explicacion, orden")
      .eq("banco_id", id)
      .order("orden");

    if (pErr) {
      if (isPreguntasTableMissing(pErr.message)) schemaMissing = true;
      else throw pErr;
    } else {
      preguntas = (pregData ?? []).map((p, i) => ({
        id: p.id,
        enunciado: p.enunciado,
        opciones: p.opciones as string[],
        respuesta: p.respuesta as number,
        explicacion: (p.explicacion as string | null) ?? undefined,
        orden: p.orden ?? i,
      }));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el test";
  }

  return (
    <div className="site site--mobile-nav site--mobile-exam">
      <SiteHeader backHref="/practicar" backLabel="Temario" />
      <main className="site-main">
        {banco && (
          <div className="test-toolbar">
            <p className="test-toolbar-title">{banco.nombre}</p>
            <div className="test-toolbar-actions">
              <Link href="/practicar" className="btn-link">
                Volver
              </Link>
            </div>
          </div>
        )}

        {schemaMissing && (
          <div className="card card-warning">
            <p className="error">La tabla de preguntas no existe en Supabase.</p>
            <p className="muted small">
              Ve a <Link href="/admin">Material</Link> y pulsa «Crear tabla
              preguntas», o ejecuta manualmente{" "}
              <code>supabase/APLICAR-AHORA.sql</code> en el SQL Editor.
            </p>
          </div>
        )}

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <p className="muted small">
              Revisa <code>.env.local</code> con las claves de Supabase.
            </p>
          </div>
        )}

        {banco && !error && !schemaMissing && (
          <TestRunner
            bancoId={banco.id}
            bancoNombre={banco.nombre}
            preguntas={preguntas}
          />
        )}
      </main>
      <footer className="site-footer">
        <p>Tests JEX</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
