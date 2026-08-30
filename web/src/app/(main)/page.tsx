import { DeviceSyncPanel } from "@/components/DeviceSyncPanel";
import { MobileContinue } from "@/components/MobileContinue";
import { MobileStudyShortcuts } from "@/components/MobileStudyShortcuts";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { TemarioChecklist } from "@/components/temario/TemarioChecklist";
import { JEX_SUBTITLE } from "@/lib/constants";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let testSections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let fichaSections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];
  let allMaterias: Awaited<ReturnType<typeof getMateriasWithCounts>> = [];
  let error: string | null = null;

  try {
    [allMaterias, { sections: testSections }] = await Promise.all([
      getMateriasWithCounts(),
      getPracticarData(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar el avance";
  }

  try {
    fichaSections = await fetchMazosGrouped();
  } catch {
    fichaSections = [];
  }

  const hasMaterial = testSections.length > 0 || fichaSections.length > 0 || allMaterias.length > 0;

  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">Tu avance</p>
        <h1 className="page-title">Resumen</h1>
        <p className="lead lead--compact">
          Notas, tests hechos y en qué centrarte · {JEX_SUBTITLE}
        </p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      <PwaInstallHint />
      <MobileContinue />

      {hasMaterial && (
        <div className="rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
          <TemarioChecklist
            variant="avance"
            testSections={testSections}
            fichaSections={fichaSections}
            allMaterias={allMaterias}
          />
        </div>
      )}

      <MobileStudyShortcuts />
      <DeviceSyncPanel />
    </>
  );
}
