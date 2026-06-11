import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getBancoForAdmin } from "@/lib/queries/bancos";
import { TestRunner } from "@/components/TestRunner";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TestPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof getBancoForAdmin>> = null;

  try {
    data = await getBancoForAdmin(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el test";
  }

  if (!data && !error) notFound();

  const preguntas = (data?.preguntas ?? []).map((p, i) => ({
    id: p.id,
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion ?? undefined,
    orden: p.orden ?? i,
  }));

  return (
    <div className="site site--mobile-nav site--mobile-exam">
      <SiteHeader backHref="/practicar" backLabel="Temario" />
      <main className="site-main">
        {data?.banco && (
          <div className="test-toolbar">
            <p className="test-toolbar-title">{data.banco.nombre}</p>
            <div className="test-toolbar-actions">
              <Link href="/practicar" className="btn-link">
                Volver
              </Link>
            </div>
          </div>
        )}

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
