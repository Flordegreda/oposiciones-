import Link from "next/link";
import { notFound } from "next/navigation";
import { MateriaResumenBody } from "@/components/MateriaResumenBody";
import { getMateriaFichaIndex } from "@/lib/queries/bancos";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MateriaFichaIndexPage({ params }: Props) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getMateriaFichaIndex>> = null;
  let error: string | null = null;

  try {
    data = await getMateriaFichaIndex(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar fichas";
  }

  if (!error && !data) notFound();

  const { materia, fichas } = data ?? { materia: null, fichas: [] };
  const legacy = materia?.resumen_md?.trim() ?? "";
  const hasFichas = fichas.length > 0;

  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">
          <Link href="/practicar" className="hero-back-link">
            ← Tests
          </Link>
        </p>
        <h1 className="page-title">{materia?.nombre ?? "Fichas"}</h1>
        <p className="lead lead--compact">
          {hasFichas
            ? `${fichas.length} tema${fichas.length !== 1 ? "s" : ""} con ficha`
            : "Apuntes y resumen de la materia"}
        </p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {!error && hasFichas && (
        <div className="card ficha-index">
          <p className="muted small ficha-index-hint">
            Elige un tema. Dentro podrás ver secciones plegables o solo las trampas 📌.
          </p>
          <ul className="ficha-index-list">
            {fichas.map((f) => (
              <li key={f.id}>
                <Link href={`/materia/${id}/tema/${f.tema_numero}`} className="ficha-index-item">
                  <span className="ficha-index-num">Tema {f.tema_numero}</span>
                  <span className="ficha-index-title">{f.titulo || `Tema ${f.tema_numero}`}</span>
                  <span className="ficha-index-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!error && !hasFichas && legacy && (
        <div className="card resumen-card">
          <p className="muted small">Resumen legacy (sin separar por tema)</p>
          <MateriaResumenBody content={legacy} />
        </div>
      )}

      {!error && !hasFichas && !legacy && (
        <div className="card">
          <p className="muted">Esta materia aún no tiene fichas. Impórtalas desde Material → Temario.</p>
          <p className="form-actions">
            <Link href="/practicar" className="btn-primary btn-sm">
              Volver a tests
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
