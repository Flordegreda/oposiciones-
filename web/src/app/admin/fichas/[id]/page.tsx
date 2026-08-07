import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AdminFichaEditor } from "@/components/admin/AdminFichaEditor";
import { AdminFichasSetup } from "@/components/admin/AdminFichasSetup";
import { getMazoConFichas } from "@/lib/queries/fichas";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminFichaMazoPage({ params }: Props) {
  const { id } = await params;
  const fichasOk = await fichasSchemaReady();
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof getMazoConFichas>> = null;
  let materias: Awaited<ReturnType<typeof getMateriasWithCounts>> = [];

  if (fichasOk) {
    try {
      [data, materias] = await Promise.all([getMazoConFichas(id), getMateriasWithCounts()]);
    } catch (e) {
      error = e instanceof Error ? e.message : "Error al cargar mazo";
    }
  }

  if (!data && fichasOk && !error) notFound();

  return (
    <div className="site site--mobile-nav">
      <SiteHeader
        backHref="/admin?tab=fichas"
        backLabel="Fichas"
        pageTitle={data?.mazo?.nombre}
      />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Administración</p>
          <h1 className="page-title">{data?.mazo.nombre ?? "Editar mazo"}</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>

        {!fichasOk && <AdminFichasSetup />}

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <p className="muted small">
              <Link href="/admin?tab=fichas">Volver a Fichas</Link>
            </p>
          </div>
        )}

        {data && (
          <AdminFichaEditor
            mazo={data.mazo}
            fichas={data.fichas}
            materias={materias.map((m) => ({ id: m.id, nombre: m.nombre }))}
          />
        )}
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
