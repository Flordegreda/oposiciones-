import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EstadisticasDashboard } from "@/components/stats/EstadisticasDashboard";
import { JEX_SUBTITLE } from "@/lib/constants";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
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

async function orVacio<T>(p: Promise<T>, vacio: T): Promise<T> {
  try {
    return await p;
  } catch {
    return vacio;
  }
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ bloque?: string }>;
}) {
  const [{ bloque }, bancoNombres, practicar, allMaterias, fichaSections] = await Promise.all([
    searchParams,
    bancosVigentes(),
    orVacio(getPracticarData(), null),
    orVacio(getMateriasWithCounts(), []),
    orVacio(fetchMazosGrouped(), []),
  ]);
  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Tu progreso</p>
          <h1 className="page-title">Estadísticas</h1>
          <p className="lead lead--compact">
            Elige un bloque para ver lo que llevas: avance, notas, fallos pendientes y fichas
          </p>
        </section>

        <div className="rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
          <EstadisticasDashboard
            bancoNombres={bancoNombres}
            testSections={practicar?.sections ?? []}
            fichaSections={fichaSections}
            allMaterias={allMaterias}
            bloqueInicial={typeof bloque === "string" ? bloque : ""}
          />
        </div>
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
