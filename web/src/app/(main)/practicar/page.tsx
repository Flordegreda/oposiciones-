import { PracticarTemario } from "@/components/PracticarTemario";
import { FalladasPromoCard } from "@/components/FalladasPromoCard";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { JEX_SUBTITLE } from "@/lib/constants";

export const revalidate = 300;

export default async function PracticarPage() {
  let sections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let error: string | null = null;

  try {
    ({ sections } = await getPracticarData());
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar bancos";
  }

  return (
    <>
      <section className="hero hero-practicar">
        <p className="hero-eyebrow">Oposición Jurídica</p>
        <h1 className="page-title">Tests</h1>
        <p className="lead lead--compact">{JEX_SUBTITLE}</p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
          <p className="muted small">
            Crea <code>.env.local</code> con las claves de Supabase (ver{" "}
            <code>.env.example</code>).
          </p>
        </div>
      )}

      {!error && <FalladasPromoCard />}

      {!error && sections.length > 0 && <PracticarTemario sections={sections} />}

      {!error && sections.length === 0 && (
        <div className="card">
          <p className="muted">Aún no hay bancos. Carga material en Material.</p>
        </div>
      )}
    </>
  );
}
