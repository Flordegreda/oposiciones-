import { notFound } from "next/navigation";
import { PrintDocumentView } from "@/components/PrintDocumentView";
import { bundleToSections } from "@/lib/print-test";
import { getPrintBundleForBanco } from "@/lib/queries/bancos";
import { parsePrintSearchParams } from "@/lib/print-url";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintBancoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const opts = parsePrintSearchParams(sp);

  const bundle = await getPrintBundleForBanco(id);
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
