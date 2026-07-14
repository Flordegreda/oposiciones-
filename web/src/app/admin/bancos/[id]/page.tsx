import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AdminBancoEditor } from "@/components/admin/AdminBancoEditor";
import { AdminSchemaSetup } from "@/components/admin/AdminSchemaSetup";
import {
  getBancoForAdmin,
  getMateriasWithCounts,
} from "@/lib/queries/bancos";
import { isPreguntasTableMissing } from "@/lib/queries/schema";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBancoPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let schemaMissing = false;
  let data: Awaited<ReturnType<typeof getBancoForAdmin>> = null;
  let materias: Awaited<ReturnType<typeof getMateriasWithCounts>> = [];

  try {
    [data, materias] = await Promise.all([
      getBancoForAdmin(id),
      getMateriasWithCounts(),
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar banco";
    if (isPreguntasTableMissing(message)) schemaMissing = true;
    else error = message;
  }

  if (!data && !schemaMissing && !error) notFound();

  return (
    <div className="site site--mobile-nav">
      <SiteHeader
        backHref="/admin?tab=bancos"
        backLabel="Bancos"
        pageTitle={data?.banco?.nombre}
      />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Administración</p>
          <h1 className="page-title">{data?.banco.nombre ?? "Editar banco"}</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>

        {schemaMissing && <AdminSchemaSetup />}

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <p className="muted small">
              <Link href="/admin?tab=bancos">Volver a bancos</Link>
            </p>
          </div>
        )}

        {data && (
          <AdminBancoEditor
            banco={data.banco}
            preguntas={data.preguntas}
            materias={materias}
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
