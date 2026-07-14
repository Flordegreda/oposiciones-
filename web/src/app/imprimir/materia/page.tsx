import { notFound } from "next/navigation";
import { PrintDocumentView } from "@/components/PrintDocumentView";
import { bundleToSections } from "@/lib/print-test";
import { getPrintBundleForMateria } from "@/lib/queries/bancos";
import { parsePrintSearchParams } from "@/lib/print-url";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintMateriaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const materiaId = typeof sp.materiaId === "string" ? sp.materiaId : null;
  if (!materiaId) notFound();

  const opts = parsePrintSearchParams(sp);
  const bundle = await getPrintBundleForMateria(materiaId);
  if (!bundle.totalPreguntas) notFound();

  return (
    <PrintDocumentView
      title={bundle.title}
      subtitle={bundle.subtitle}
      sections={bundleToSections(bundle)}
      answerStyle={opts.answerStyle}
      showExplanations={opts.showExplanations}
    />
  );
}
