import { BancoTile } from "@/components/BancoTile";
import { getPracticarData } from "@/lib/queries/bancos";
import { JEX_SUBTITLE } from "@/lib/constants";

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

      {sections.length > 0 && (
        <div className="linea-block">
          <h2 className="linea-block-title">Temario</h2>
          {sections.map((section) => (
            <section key={section.nombre} className="materia-section card">
              <div className="materia-head">
                <span className="materia-tag">{section.nombre}</span>
                <span className="muted small">
                  {section.bancos.length} banco
                  {section.bancos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="banco-grid banco-grid--wide">
                {section.bancos.map((b) => (
                  <BancoTile key={b.id} banco={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!error && sections.length === 0 && (
        <div className="card">
          <p className="muted">Aún no hay bancos. Carga material en Material.</p>
        </div>
      )}
    </>
  );
}
