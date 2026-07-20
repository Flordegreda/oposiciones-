import { notFound } from "next/navigation";
import { PrintDocumentView } from "@/components/PrintDocumentView";
import type { SimulacroPresetId } from "@/lib/exam-utils";
import { startSimulacroSession } from "@/lib/queries/simulacro";
import { parsePrintSearchParams } from "@/lib/print-url";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintSimulacroPage({ searchParams }: Props) {
  const sp = await searchParams;
  const presetId = (typeof sp.presetId === "string" ? sp.presetId : "oficial") as SimulacroPresetId;
  const materiaId = typeof sp.materiaId === "string" ? sp.materiaId : null;
  const opts = parsePrintSearchParams(sp);

  const session = await startSimulacroSession(presetId, materiaId);
  if (!session.list.length) notFound();

  const teoricoPregs = session.list.filter((p) => p.tipo === "teorico");
  const practicoPregs = session.list.filter((p) => p.tipo === "practico");

  const sections = [];
  if (teoricoPregs.length) {
    sections.push({
      bancoId: "teorico",
      bancoNombre: "Preguntas Teóricas",
      tipo: "teorico",
      preguntas: teoricoPregs.map((p) => ({
        enunciado: p.enunciado,
        opciones: p.opciones as string[],
        respuesta: p.respuesta,
        explicacion: p.explicacion ?? null,
      })),
    });
  }
  if (practicoPregs.length) {
    sections.push({
      bancoId: "practico",
      bancoNombre: "Preguntas Prácticas",
      tipo: "practico",
      preguntas: practicoPregs.map((p) => ({
        enunciado: p.enunciado,
        opciones: p.opciones as string[],
        respuesta: p.respuesta,
        explicacion: p.explicacion ?? null,
      })),
    });
  }

  const presetLabel = presetId === "oficial" ? "Simulacro Oficial" : "Mini Simulacro";
  const materiaLabel = session.materiaLabel;

  return (
    <PrintDocumentView
      title={presetLabel + (materiaLabel ? ` · ${materiaLabel}` : " · Todas las materias")}
      subtitle={session.subtitle}
      sections={sections.map((s) => ({
        title: s.bancoNombre,
        preguntas: s.preguntas,
      }))}
      answerStyle={opts.answerStyle}
      showExplanations={opts.showExplanations}
    />
  );
}
