import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AnkiDeck } from "@/components/AnkiDeck";
import { getMazoConFichas } from "@/lib/queries/fichas";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getMazoConFichas(id);
    if (data?.mazo.nombre) {
      return { title: `Fichas · ${data.mazo.nombre} — JEX` };
    }
  } catch {
    /* ignore */
  }
  return { title: "Fichas — JEX" };
}

export default async function FichaMazoPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof getMazoConFichas>> = null;

  try {
    data = await getMazoConFichas(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar las fichas";
  }

  if (!data && !error) notFound();

  return (
    <div className="site site--mobile-nav site--flashcards">
      <SiteHeader
        backHref="/fichas"
        backLabel="Fichas"
        pageTitle={data?.mazo?.nombre ? `Fichas · ${data.mazo.nombre}` : "Fichas"}
      />
      <main className="site-main site-main--flashcards">
        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <p className="muted small">
              Si falta la tabla, ve a <Link href="/admin?tab=fichas">Material → Fichas</Link>.
            </p>
          </div>
        )}

        {data?.mazo && !error && (
          <AnkiDeck fichas={data.fichas} mazoId={data.mazo.id} />
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
