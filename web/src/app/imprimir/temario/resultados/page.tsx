import { TemarioResultadosPrintView } from "@/components/temario/TemarioResultadosPrintView";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";

export const dynamic = "force-dynamic";

export default async function PrintTemarioResultadosPage() {
  let testSections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let fichaSections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];
  let allMaterias: Awaited<ReturnType<typeof getMateriasWithCounts>> = [];

  try {
    [allMaterias, { sections: testSections }] = await Promise.all([
      getMateriasWithCounts(),
      getPracticarData(),
    ]);
  } catch {
    testSections = [];
  }

  try {
    fichaSections = await fetchMazosGrouped();
  } catch {
    fichaSections = [];
  }

  return (
    <TemarioResultadosPrintView
      testSections={testSections}
      fichaSections={fichaSections}
      allMaterias={allMaterias}
    />
  );
}
