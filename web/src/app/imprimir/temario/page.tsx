import { notFound } from "next/navigation";
import { TemarioChecklistPrintView } from "@/components/temario/TemarioChecklistPrintView";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";

export const dynamic = "force-dynamic";

export default async function PrintTemarioPage() {
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

  if (allMaterias.length === 0 && testSections.length === 0 && fichaSections.length === 0) {
    notFound();
  }

  return (
    <TemarioChecklistPrintView
      testSections={testSections}
      fichaSections={fichaSections}
      allMaterias={allMaterias}
    />
  );
}
