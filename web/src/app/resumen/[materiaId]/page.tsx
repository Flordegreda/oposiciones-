import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { formatPdfSize } from "@/lib/format-pdf-size";
import { getResumenForMateria } from "@/lib/queries/resumenes";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ materiaId: string }>;
};

export default async function ResumenPage({ params }: PageProps) {
  const { materiaId } = await params;
  const resumen = await getResumenForMateria(materiaId);
  if (!resumen) notFound();

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main resumen-main">
        <div className="resumen-toolbar">
          <Link href="/practicar" className="btn-link">
            ← Tests
          </Link>
          <div className="resumen-toolbar-meta">
            <h1 className="page-title resumen-title">{resumen.materiaNombre}</h1>
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
          <Link href="/practicar" className="btn-primary">
            Volver a tests
          </Link>
        </div>

        <div className="resumen-viewer card card-elevated">
          <iframe
            src={resumen.url}
            title={`Resumen: ${resumen.materiaNombre}`}
            className="resumen-frame"
          />
        </div>
      </main>
      <footer className="site-footer">
        <p>Resumen PDF · {resumen.materiaNombre}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
