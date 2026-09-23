import { DeviceSyncPanel } from "@/components/DeviceSyncPanel";
import { MobileContinue } from "@/components/MobileContinue";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { ResumenAvance } from "@/components/ResumenAvance";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
import { errorMessage } from "@/lib/error-message";

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
    error = errorMessage(e, "Error al cargar el avance");
  }

  try {
    fichaSections = await fetchMazosGrouped();
  } catch (e) {
    fichaSections = [];
    if (!error) error = errorMessage(e, "Error al cargar las fichas");
  }

  const hasMaterial = testSections.length > 0 || fichaSections.length > 0 || allMaterias.length > 0;

  return (
    <>
      <section className="hero hero--compact">
        <h1 className="page-title">Resumen</h1>
        <p className="lead lead--compact">Avance y material</p>
      </section>

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      <PwaInstallHint />
      <MobileContinue />

      {hasMaterial && (
        <ResumenAvance
          testSections={testSections}
          fichaSections={fichaSections}
          allMaterias={allMaterias}
        />
      )}

      <DeviceSyncPanel />
    </>
  );
}
