import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSchemaSetup } from "@/components/admin/AdminSchemaSetup";
import { AdminIntentosSetup } from "@/components/admin/AdminIntentosSetup";
import { AdminResultadosSetup } from "@/components/admin/AdminResultadosSetup";
import {
  getAdminBancos,
  getMateriasWithCounts,
  type BancoRow,
  type MaterialStats,
} from "@/lib/queries/bancos";
import { getMaterialStats } from "@/lib/queries/bancos-cached";
import {
  getPreguntasCount,
  intentosTableExists,
  preguntasTableExists,
  resultadosTableExists,
} from "@/lib/queries/schema";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let bancos: BancoRow[] = [];
  let materias: { id: string; nombre: string; bancos: number }[] = [];
  let error: string | null = null;
  let schemaOk = true;
  let intentosOk = true;
  let resultadosOk = true;
  let preguntasCount: number | null = null;
  let stats: MaterialStats = {
    materias: 0,
    bancos: 0,
    preguntas: 0,
    teorico: { bancos: 0, preguntas: 0 },
    practico: { bancos: 0, preguntas: 0 },
    porMateria: [],
  };

  try {
    schemaOk = await preguntasTableExists();
    if (schemaOk) {
      preguntasCount = await getPreguntasCount();
      intentosOk = await intentosTableExists();
      resultadosOk = await resultadosTableExists();
    }
    [bancos, materias, stats] = await Promise.all([
      getAdminBancos(),
      getMateriasWithCounts(),
      getMaterialStats(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Administración</p>
          <h1 className="page-title">Temario</h1>
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

        {!schemaOk && <AdminSchemaSetup />}

        {schemaOk && !intentosOk && <AdminIntentosSetup />}

        {schemaOk && !resultadosOk && <AdminResultadosSetup />}

        {schemaOk && preguntasCount === 0 && bancos.length > 0 && (
          <div className="card card-warning">
            <p className="muted small">
              Los bancos existen pero tienen <strong>0 preguntas</strong>. Importa de
              nuevo en la pestaña <strong>Importar</strong> o edita cada banco.
            </p>
          </div>
        )}

        <Suspense fallback={<p className="muted">Cargando…</p>}>
          <AdminPanel bancos={bancos} materias={materias} stats={stats} schemaOk={schemaOk} />
        </Suspense>

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
