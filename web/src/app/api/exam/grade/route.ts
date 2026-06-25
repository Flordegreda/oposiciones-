import { NextResponse } from "next/server";
import { gradeExamAnswers } from "@/lib/queries/exam-grade";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      answers?: { id?: string; selected?: number | null }[];
    };

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ error: "Falta array answers" }, { status: 400 });
    }

    const answers = body.answers.map((a) => ({
      id: String(a.id ?? ""),
      selected: typeof a.selected === "number" ? a.selected : null,
    }));

    if (answers.some((a) => !a.id)) {
      return NextResponse.json({ error: "Cada answer necesita id" }, { status: 400 });
    }

    const results = await gradeExamAnswers(answers);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al corregir" },
      { status: 500 },
    );
  }
}
