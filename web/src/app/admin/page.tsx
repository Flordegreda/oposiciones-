import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/SiteHeader";

import { MobileBottomNav } from "@/components/MobileBottomNav";

import { AdminPanel } from "@/components/admin/AdminPanel";

import { AdminPreguntasRpcSetup } from "@/components/admin/AdminPreguntasRpcSetup";
import { AdminFichasSetup } from "@/components/admin/AdminFichasSetup";
import { AdminResultadosSetup } from "@/components/admin/AdminResultadosSetup";
import { AdminSchemaSetup } from "@/components/admin/AdminSchemaSetup";

import { AdminSupuestosSetup } from "@/components/admin/AdminSupuestosSetup";

import { getAdminPageData } from "@/lib/queries/bancos-cached";
import { fetchMazosFichas } from "@/lib/queries/fichas";
import { resultadosSchemaReady } from "@/lib/queries/schema";

import { JEX_SUBTITLE } from "@/lib/constants";



export const dynamic = "force-dynamic";

const LEGACY_MAIN_TABS = new Set(["temario", "contenido", "materias", "bancos", "resumenes"]);

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  if (tab === "cocinar") redirect("/admin?tab=importar");
  if (tab && LEGACY_MAIN_TABS.has(tab)) redirect("/admin");

  let error: string | null = null;

  let data: Awaited<ReturnType<typeof getAdminPageData>> | null = null;



  try {

    data = await getAdminPageData();

  } catch (e) {

    error = e instanceof Error ? e.message : "Error";

  }



  const bancos = data?.bancos ?? [];

  const materias = data?.materias ?? [];

  const stats = data?.stats ?? {
    materias: 0,
    bancos: 0,
    preguntas: 0,
    teorico: { bancos: 0, preguntas: 0 },
    practico: { bancos: 0, preguntas: 0 },
    mazosFichas: 0,
    fichas: 0,
    porMateria: [],
  };

  const schemaOk = data?.schemaOk ?? true;

  const supuestosOk = data?.supuestosOk ?? true;
  const preguntasRpcOk = data?.preguntasRpcOk ?? true;
  const fichasOk = data?.fichasOk ?? false;
  const mazosFichas = fichasOk ? await fetchMazosFichas({ activeOnly: false }) : [];
  const resultadosOk = await resultadosSchemaReady().catch(() => false);



  return (

    <div className="site site--mobile-nav">

      <SiteHeader />

      <main className="site-main">

        <section className="hero hero--compact">

          <p className="hero-eyebrow">Administración</p>

          <h1 className="page-title">Material</h1>

          <p className="lead lead--compact">{JEX_SUBTITLE}</p>

        </section>



        {error && (

          <div className="card card-warning">

            <p className="error">{error}</p>

            <p className="muted small">

              Configura <code>.env.local</code> con Supabase (ver <code>.env.example</code>).

            </p>

          </div>

        )}



        {schemaOk && !preguntasRpcOk && <AdminPreguntasRpcSetup />}

        {!schemaOk && <AdminSchemaSetup />}



        {schemaOk && !supuestosOk && <AdminSupuestosSetup />}

        {schemaOk && !fichasOk && <AdminFichasSetup />}

        {schemaOk && !resultadosOk && <AdminResultadosSetup />}



        {schemaOk && stats.preguntas === 0 && bancos.length > 0 && (

          <div className="card card-warning">

            <p className="muted small">

              Los bancos existen pero tienen <strong>0 preguntas</strong>. Importa de

              nuevo en la pestaña <strong>Importar</strong> o edita cada banco.

            </p>

          </div>

        )}



        <AdminPanel
          bancos={bancos}
          materias={materias}
          stats={stats}
          schemaOk={schemaOk}
          supuestosOk={supuestosOk}
          fichasOk={fichasOk}
          mazosFichas={mazosFichas}
        />



        <p className="admin-mobile-only">

          <Link href="/practicar" className="btn-primary">

            Ir a tests

          </Link>

        </p>

      </main>

      <footer className="site-footer">

        <p>{JEX_SUBTITLE}</p>

      </footer>

      <MobileBottomNav />

    </div>

  );

}

