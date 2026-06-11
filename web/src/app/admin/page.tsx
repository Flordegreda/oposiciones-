import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSchemaSetup } from "@/components/admin/AdminSchemaSetup";
import {
  getAdminBancos,
  getMateriasWithCounts,
  type BancoRow,
} from "@/lib/queries/bancos";
import {
  getPreguntasCount,
  preguntasTableExists,
} from "@/lib/queries/schema";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let bancos: BancoRow[] = [];
  let materias: { id: string; nombre: string; bancos: number }[] = [];
  let error: string | null = null;
  let schemaOk = true;
  let preguntasCount: number | null = null;

  try {
    schemaOk = await preguntasTableExists();
    if (schemaOk) {
      preguntasCount = await getPreguntasCount();
    }
    [bancos, materias] = await Promise.all([
      getAdminBancos(),
      getMateriasWithCounts(),
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

        {!schemaOk && <AdminSchemaSetup />}

        {schemaOk && preguntasCount === 0 && bancos.length > 0 && (
          <div className="card card-warning">
            <p className="muted small">
              Los bancos existen pero tienen <strong>0 preguntas</strong>. Importa de
              nuevo el material en <strong>Cargar material</strong> o edita cada banco.
            </p>
          </div>
        )}

        <Suspense fallback={<p className="muted">Cargando…</p>}>
          <AdminPanel bancos={bancos} materias={materias} schemaOk={schemaOk} />
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
