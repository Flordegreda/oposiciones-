import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getBancoForTest } from "@/lib/queries/bancos-cached";
import { TestRunner } from "@/components/TestRunner";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getBancoForTest(id);
    if (data?.banco.nombre) {
      return { title: `${data.banco.nombre} — JEX` };
    }
  } catch {
    /* ignore */
  }
  return { title: "Test — JEX" };
}

export default async function TestPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof getBancoForTest>> = null;

  try {
    data = await getBancoForTest(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el test";
  }

  if (!data && !error) notFound();

  const preguntas = (data?.preguntas ?? []).map((p, i) => ({
    id: p.id,
    tipo: data!.banco.tipo === "practico" ? ("practico" as const) : ("teorico" as const),
    enunciado: p.enunciado,
    opciones: p.opciones,
    orden: p.orden ?? i,
    supuestoId: p.supuesto_id,
    supuestoTitulo: p.supuesto_titulo,
    supuestoTexto: p.supuesto_texto ?? undefined,
  }));

  return (
    <div className="site site--mobile-nav site--mobile-exam">
      <SiteHeader pageTitle={data?.banco?.nombre} />
      <main className="site-main">
        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <p className="muted small">
              Si falta la tabla, ve a <Link href="/admin">Material</Link> y crea la
              tabla preguntas.
            </p>
          </div>
        )}

        {data?.banco && !error && (
          <TestRunner
            bancoId={data.banco.id}
            bancoNombre={data.banco.nombre}
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
