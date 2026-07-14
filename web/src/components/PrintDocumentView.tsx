import { buildPrintBody, type PrintHtmlJob } from "@/lib/print-html";

export type { PrintHtmlJob };

export function PrintDocumentView(props: PrintHtmlJob) {
  return <div dangerouslySetInnerHTML={{ __html: buildPrintBody(props) }} />;
}
