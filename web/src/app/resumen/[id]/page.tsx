import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { formatPdfSize } from "@/lib/format-pdf-size";
import { getResumenById } from "@/lib/queries/resumenes";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResumenViewerPage({ params }: PageProps) {
  const { id } = await params;
  const resumen = await getResumenById(id);
  if (!resumen) notFound();

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main resumen-main">
        <div className="resumen-toolbar">
          <Link href="/resumenes" className="btn-link">
            ← Resúmenes
          </Link>
          <div className="resumen-toolbar-meta">
            <p className="muted small resumen-materia-tag">{resumen.materiaNombre}</p>
            <h1 className="page-title resumen-title">{resumen.titulo}</h1>
            <p className="muted small resumen-file-meta">
              {resumen.filename} · {formatPdfSize(resumen.sizeBytes)}
            </p>
          </div>
        </div>

        <div className="card resumen-mobile-card">
          <p className="muted">
            El resumen PDF está pensado para <strong>tablet o PC</strong>. Ábrelo desde un
            dispositivo con pantalla más grande.
          </p>
          <Link href="/resumenes" className="btn-primary">
            Volver a resúmenes
          </Link>
        </div>

        <div className="resumen-viewer card card-elevated">
          <iframe
            src={resumen.url}
            title={resumen.titulo}
            className="resumen-frame"
          />
        </div>
      </main>
      <footer className="site-footer">
        <p>
          {resumen.materiaNombre} · {resumen.titulo}
        </p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
