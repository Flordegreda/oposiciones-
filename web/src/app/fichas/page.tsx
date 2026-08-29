import Link from "next/link";
import { FichasBiblioteca } from "@/components/FichasBiblioteca";
import { MobileContinue } from "@/components/MobileContinue";
import { MobileStudyHero } from "@/components/MobileStudyHero";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { JEX_SUBTITLE } from "@/lib/constants";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

/** Lista de mazos: siempre fresca tras importar (evita pantalla vacía por ISR). */
export const dynamic = "force-dynamic";

export default async function FichasPage() {
  let sections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];
  let error: string | null = null;
  let fichasOk = false;

  try {
    fichasOk = await fichasSchemaReady();
    if (fichasOk) sections = await fetchMazosGrouped();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar fichas";
  }

  const totalMazos = sections.reduce((n, s) => n + s.mazos.length, 0);
  const totalFichas = sections.reduce(
    (n, s) => n + s.mazos.reduce((m, z) => m + z.numFichas, 0),
    0,
  );

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <MobileStudyHero
          mode="fichas"
          mazos={totalMazos}
          fichas={totalFichas}
          materias={sections.length}
        />

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
          </div>
        )}

        {!error && !fichasOk && (
          <div className="card">
            <p className="muted">
              Las fichas aún no están activadas. Configúralas en{" "}
              <Link href="/admin?tab=fichas">Material → Importar fichas</Link>.
            </p>
          </div>
        )}

        {!error && fichasOk && totalMazos === 0 && (
          <div className="card">
            <p className="muted">Aún no hay mazos de fichas.</p>
            <p className="muted small">
              Impórtalos en <Link href="/admin?tab=fichas">Material → Importar fichas</Link> con
              pregunta y respuesta (formato Anki / P: R:).
            </p>
          </div>
        )}

        {!error && fichasOk && totalMazos > 0 && (
          <>
            <MobileContinue />
            <FichasBiblioteca sections={sections} />
          </>
        )}
      </main>
      <footer className="site-footer">
        <p>
          {JEX_SUBTITLE}
          {totalMazos > 0
            ? ` · ${totalMazos} mazo${totalMazos !== 1 ? "s" : ""} · ${sections.length} materia${sections.length !== 1 ? "s" : ""} con fichas`
            : ""}
        </p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
