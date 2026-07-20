import { NextResponse } from "next/server";
import { startSimulacroSession } from "@/lib/queries/simulacro";
import type { SimulacroPresetId } from "@/lib/exam-utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const presetId = (searchParams.get("presetId") ?? "oficial") as SimulacroPresetId;
  const materiaId = searchParams.get("materiaId") || null;

  try {
    const session = await startSimulacroSession(presetId, materiaId);

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

    return NextResponse.json({
      title: presetLabel + (materiaLabel ? ` · ${materiaLabel}` : " · Todas las materias"),
      subtitle: session.subtitle,
      sections,
      totalPreguntas: session.list.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar simulacro" },
      { status: 500 },
    );
  }
}
