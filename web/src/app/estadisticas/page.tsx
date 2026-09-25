import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EstadisticasDashboard } from "@/components/stats/EstadisticasDashboard";
import { FichasEstadisticas } from "@/components/stats/FichasEstadisticas";
import { JEX_SUBTITLE } from "@/lib/constants";
import { fetchMazosFichas, type MazoFichas } from "@/lib/queries/fichas";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Estadísticas — JEX",
};

export const dynamic = "force-dynamic";

async function bancosVigentes(): Promise<Record<string, string> | undefined> {
  try {
    const { data, error } = await getSupabase().from("bancos").select("id, nombre");
    if (error) return undefined;
    return Object.fromEntries((data ?? []).map((b) => [String(b.id), String(b.nombre ?? "")]));
  } catch {
    return undefined;
  }
}

async function mazosConFichas(): Promise<MazoFichas[]> {
  try {
    return (await fetchMazosFichas({ activeOnly: true })).filter((m) => m.numFichas > 0);
  } catch {
    return [];
  }
}

export default async function EstadisticasPage() {
  const [bancoNombres, mazos] = await Promise.all([bancosVigentes(), mazosConFichas()]);
  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Tu progreso</p>
          <h1 className="page-title">Estadísticas</h1>
          <p className="lead lead--compact">
            KPIs, evolución y bancos — datos locales con sync a la nube
          </p>
        </section>

        <div className="rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
          <EstadisticasDashboard bancoNombres={bancoNombres} />
        </div>

        <FichasEstadisticas mazos={mazos} />
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
