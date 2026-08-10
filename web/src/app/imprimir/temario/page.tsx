import { notFound } from "next/navigation";
import { TemarioChecklistPrintView } from "@/components/temario/TemarioChecklistPrintView";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { fetchMazosGrouped } from "@/lib/queries/fichas";
import { fichasSchemaReady } from "@/lib/queries/schema";

export const dynamic = "force-dynamic";

export default async function PrintTemarioPage() {
  let testSections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let fichaSections: Awaited<ReturnType<typeof fetchMazosGrouped>> = [];

  try {
    ({ sections: testSections } = await getPracticarData());
    if (await fichasSchemaReady()) {
      fichaSections = await fetchMazosGrouped();
    }
  } catch {
    notFound();
  }

  const totalBancos = testSections.reduce((n, s) => n + s.bancos.length, 0);
  const totalMazos = fichaSections.reduce((n, s) => n + s.mazos.length, 0);
  if (totalBancos === 0 && totalMazos === 0) notFound();

  return (
    <TemarioChecklistPrintView
      testSections={testSections}
      fichaSections={fichaSections}
    />
  );
}
