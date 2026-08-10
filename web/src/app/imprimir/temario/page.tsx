import { notFound } from "next/navigation";
import { TemarioChecklistPrintView } from "@/components/temario/TemarioChecklistPrintView";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { getMateriasWithCounts } from "@/lib/queries/bancos";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

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
    if (await fichasSchemaReady()) {
      fichaSections = await fetchMazosGrouped();
    }
  } catch {
    notFound();
  }

  if (allMaterias.length === 0) notFound();

  return (
    <TemarioChecklistPrintView
      testSections={testSections}
      fichaSections={fichaSections}
      allMaterias={allMaterias}
    />
  );
}
