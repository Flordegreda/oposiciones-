import Link from "next/link";
import { notFound } from "next/navigation";
import { MateriaResumenBody } from "@/components/MateriaResumenBody";
import { getMateriaResumen } from "@/lib/queries/bancos";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MateriaResumenPage({ params }: Props) {
  const { id } = await params;
  let materia: Awaited<ReturnType<typeof getMateriaResumen>> = null;
  let error: string | null = null;

  try {
    materia = await getMateriaResumen(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar la ficha";
  }

  if (!error && !materia) notFound();

  const resumen = materia?.resumen_md?.trim() ?? "";

  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">
          <Link href="/practicar" className="hero-back-link">
            ← Tests
          </Link>
        </p>
        <h1 className="page-title">{materia?.nombre ?? "Ficha"}</h1>
        <p className="lead lead--compact">Apuntes y resumen de la materia</p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {!error && !resumen && (
        <div className="card">
          <p className="muted">Esta materia aún no tiene ficha. Impórtala desde Material → Temario.</p>
          <p className="form-actions">
            <Link href="/practicar" className="btn-primary btn-sm">
              Volver a tests
            </Link>
          </p>
        </div>
      )}

      {!error && resumen && (
        <div className="card resumen-card">
          <MateriaResumenBody content={resumen} />
        </div>
      )}
    </>
  );
}
