import { notFound } from "next/navigation";
import { getMazoConFichas } from "@/lib/queries/fichas";

type Props = { params: Promise<{ id: string }> };

export default async function PrintFichasPage({ params }: Props) {
  const { id } = await params;
  const data = await getMazoConFichas(id);
  if (!data?.fichas.length) notFound();

  const { mazo, fichas } = data;
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="print-document">
      <header className="print-sheet-head">
        <h1 className="print-sheet-title">Fichas · {mazo.nombre}</h1>
        <p className="print-sheet-sub">{mazo.materiaNombre}</p>
        <p className="print-sheet-meta">
          {fichas.length} ficha{fichas.length !== 1 ? "s" : ""} · {date}
        </p>
      </header>

      <ol className="print-fichas-list">
        {fichas.map((f, i) => (
          <li key={f.id} className="print-ficha-item">
            <p className="print-ficha-num">{i + 1}.</p>
            <div className="print-ficha-body">
              <p className="print-ficha-q">
                <span className="print-ficha-label">P.</span> {f.frente}
              </p>
              <p className="print-ficha-a">
                <span className="print-ficha-label">R.</span> {f.dorso}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
