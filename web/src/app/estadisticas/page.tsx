import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EstadisticasDashboard } from "@/components/stats/EstadisticasDashboard";
import { JEX_SUBTITLE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Estadísticas — JEX",
};

export default function EstadisticasPage() {
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
          <EstadisticasDashboard />
        </div>
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
