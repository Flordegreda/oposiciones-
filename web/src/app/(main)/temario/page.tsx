import Link from "next/link";
import { TemarioChecklist } from "@/components/temario/TemarioChecklist";
import { JEX_SUBTITLE } from "@/lib/constants";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

export const dynamic = "force-dynamic";

export default async function TemarioPage() {
  let testSections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let fichaSections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];
  let error: string | null = null;

  try {
    ({ sections: testSections } = await getPracticarData());
    if (await fichasSchemaReady()) {
      fichaSections = await fetchMazosGrouped();
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el temario";
  }

  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">Tu material</p>
        <h1 className="page-title">Plan de temario</h1>
        <p className="lead lead--compact">
          Checklist por materia: tests y fichas · {JEX_SUBTITLE}
        </p>
        <p className="muted small" style={{ marginTop: "0.5rem" }}>
          <Link href="/practicar">Tests</Link>
          {" · "}
          <Link href="/fichas">Fichas</Link>
          {" · "}
          <Link href="/estadisticas">Estadísticas</Link>
          {" · "}
          <Link href="/imprimir/temario" target="_blank" rel="noopener noreferrer">
            Imprimir checklist
          </Link>
        </p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {!error && (
        <div className="rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
          <TemarioChecklist testSections={testSections} fichaSections={fichaSections} />
        </div>
      )}
    </>
  );
}
