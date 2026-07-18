import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { getBancoForTest } from "@/lib/queries/bancos-cached";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getBancoForTest(id);
    if (data?.banco.nombre) {
      return { title: `Tarjetas · ${data.banco.nombre} — JEX` };
    }
  } catch {
    /* ignore */
  }
  return { title: "Tarjetas — JEX" };
}

export default async function TarjetasPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof getBancoForTest>> = null;

  try {
    data = await getBancoForTest(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar las tarjetas";
  }

  if (!data && !error) notFound();

  const preguntas = (data?.preguntas ?? []).map((p) => ({
    id: p.id,
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion,
    supuestoTexto: p.supuesto_texto ?? undefined,
    supuestoTitulo: p.supuesto_titulo ?? undefined,
  }));

  return (
    <>
      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
          <p className="muted small">
            Si falta la tabla, ve a <Link href="/admin">Material</Link>.
          </p>
        </div>
      )}

      {data?.banco && !error && (
        <FlashcardDeck
          bancoNombre={data.banco.nombre}
          preguntas={preguntas}
          backHref={`/test/${id}`}
        />
      )}
    </>
  );
}
