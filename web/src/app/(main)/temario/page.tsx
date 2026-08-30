import Link from "next/link";
import { MobileStudyHero } from "@/components/MobileStudyHero";
import { TemarioChecklist } from "@/components/temario/TemarioChecklist";
import { JEX_SUBTITLE } from "@/lib/constants";
import { getAdminPageData, getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";

export const dynamic = "force-dynamic";

export default async function TemarioPage() {
  let testSections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let fichaSections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];
  let allMaterias: Awaited<ReturnType<typeof getMateriasWithCounts>> = [];
  let stats: Awaited<ReturnType<typeof getAdminPageData>>["stats"] | null = null;
  let error: string | null = null;

  try {
    [allMaterias, { sections: testSections }, { stats }] = await Promise.all([
      getMateriasWithCounts(),
      getPracticarData(),
      getAdminPageData(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el temario";
  }

  try {
    fichaSections = await fetchMazosGrouped();
  } catch {
    fichaSections = [];
  }

  const hasMaterial = testSections.length > 0 || fichaSections.length > 0 || allMaterias.length > 0;

  return (
    <>
      {stats ? (
        <MobileStudyHero
          mode="material"
          stats={stats}
          title="Plan"
          eyebrow="Material disponible"
          lead={`Tests y fichas cargados · ${JEX_SUBTITLE}`}
        />
      ) : (
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Material disponible</p>
          <h1 className="page-title">Plan</h1>
          <p className="lead lead--compact">
            Inventario de tests y fichas · {JEX_SUBTITLE}
          </p>
        </section>
      )}

      <p className="muted small" style={{ margin: "0 0 1rem" }}>
        <Link href="/">Resumen (tu avance)</Link>
        {" · "}
        <Link href="/practicar">Tests</Link>
        {" · "}
        <Link href="/fichas">Fichas</Link>
        {" · "}
        <Link href="/imprimir/temario" target="_blank" rel="noopener noreferrer">
          Imprimir inventario
        </Link>
      </p>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {hasMaterial && (
        <div className="rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
          <TemarioChecklist
            variant="material"
            testSections={testSections}
            fichaSections={fichaSections}
            allMaterias={allMaterias}
          />
        </div>
      )}
    </>
  );
}
