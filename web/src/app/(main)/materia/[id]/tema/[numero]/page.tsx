import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaViewer } from "@/components/FichaViewer";
import { getFichaByTema } from "@/lib/queries/fichas";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string; numero: string }>;
};

export default async function MateriaFichaTemaPage({ params }: Props) {
  const { id, numero } = await params;
  const temaNumero = parseInt(numero, 10);
  if (!Number.isFinite(temaNumero) || temaNumero <= 0) notFound();

  let ficha: Awaited<ReturnType<typeof getFichaByTema>> = null;
  let error: string | null = null;

  try {
    ficha = await getFichaByTema(id, temaNumero);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar la ficha";
  }

  if (!error && !ficha) notFound();

  const content = ficha?.resumen_md?.trim() ?? "";

  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">
          <Link href={`/materia/${id}`} className="hero-back-link">
            ← {ficha?.materia_nombre ?? "Fichas"}
          </Link>
        </p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {!error && content && ficha && (
        <div className="card ficha-viewer-card">
          <FichaViewer
            temaNumero={ficha.tema_numero}
            titulo={ficha.titulo}
            content={content}
            materiaNombre={ficha.materia_nombre}
          />
        </div>
      )}

      {!error && !content && (
        <div className="card">
          <p className="muted">Esta ficha está vacía.</p>
        </div>
      )}
    </>
  );
}
