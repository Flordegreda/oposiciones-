import Link from "next/link";

import { ResumenesBiblioteca } from "@/components/ResumenesBiblioteca";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { JEX_SUBTITLE } from "@/lib/constants";
import { fetchResumenesGrouped } from "@/lib/queries/resumenes";

export const revalidate = 300;

export default async function ResumenesPage() {
  let sections: Awaited<ReturnType<typeof fetchResumenesGrouped>> = [];
  let error: string | null = null;

  try {
    sections = await fetchResumenesGrouped();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar resúmenes";
  }

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main resumenes-page">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Material de estudio</p>
          <h1 className="page-title">Resúmenes</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
          </div>
        )}

        <div className="card resumen-mobile-card">
          <p className="muted">
            Los resúmenes PDF están pensados para <strong>tablet o PC</strong>. En móvil puedes
            ver la lista, pero la lectura cómoda requiere pantalla más grande.
          </p>
          <Link href="/practicar" className="btn-primary">
            Ir a tests
          </Link>
        </div>

        {!error && total === 0 ? (
          <div className="card resumenes-empty resumenes-empty--desktop">
            <p className="muted">Aún no hay resúmenes PDF subidos.</p>
            <p className="muted small">
              Súbelos en <Link href="/admin?tab=resumenes">Material → Resúmenes</Link>.
            </p>
          </div>
        ) : (
          !error && <ResumenesBiblioteca sections={sections} />
        )}
      </main>
      <footer className="site-footer">
        <p>
          {total} PDF{total !== 1 ? "s" : ""} · {sections.length} materia
          {sections.length !== 1 ? "s" : ""}
        </p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
