import { NextRequest, NextResponse } from "next/server";
import { falladasSchemaReady } from "@/lib/queries/schema";
import {
  fetchColaPreguntas,
  getColaCounts,
  removeColaItems,
  upsertColaItems,
} from "@/lib/queries/falladas";

function deviceFrom(req: NextRequest, body?: { dispositivoId?: string }): string | null {
  const fromBody = body?.dispositivoId?.trim();
  const fromHeader = req.headers.get("x-dispositivo-id")?.trim();
  const raw = fromBody || fromHeader || "";
  return raw || null;
}

export async function GET(req: NextRequest) {
  if (!(await falladasSchemaReady())) {
    return NextResponse.json({ ready: false, counts: { total: 0, falladas: 0, dudosas: 0 }, preguntas: [] });
  }

  const dispositivoId = req.nextUrl.searchParams.get("dispositivoId")?.trim() || null;
  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }

  const withPreguntas = req.nextUrl.searchParams.get("preguntas") === "1";
  const counts = await getColaCounts(dispositivoId);
  if (!withPreguntas) {
    return NextResponse.json({ ready: true, counts });
  }

  const preguntas = await fetchColaPreguntas(dispositivoId);
  return NextResponse.json({ ready: true, counts, preguntas });
}

/** Añade/actualiza falladas y dudosas tras un test. */
export async function POST(req: NextRequest) {
  if (!(await falladasSchemaReady())) {
    return NextResponse.json(
      { error: "Activa la cola de falladas (tarjeta amarilla en Material)" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const dispositivoId = deviceFrom(req, body);
  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }

  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  const items: { preguntaId: string; bancoId?: string | null; motivo: "fallada" | "dudosa" }[] =
    [];

  for (const raw of itemsRaw) {
    const preguntaId = String(raw?.preguntaId ?? "").trim();
    if (!preguntaId) continue;
    const motivo = raw?.motivo === "dudosa" ? "dudosa" : "fallada";
    const bancoId =
      typeof raw?.bancoId === "string" && raw.bancoId.trim() ? raw.bancoId.trim() : null;
    items.push({ preguntaId, bancoId, motivo });
  }

  if (!items.length) {
    return NextResponse.json({ saved: 0, message: "Nada que guardar" });
  }

  try {
    const saved = await upsertColaItems(dispositivoId, items);
    const counts = await getColaCounts(dispositivoId);
    return NextResponse.json({
      saved,
      counts,
      message: `Guardadas ${saved} en la cola de repaso.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 },
    );
  }
}

/** Quita preguntas acertadas de la cola. */
export async function DELETE(req: NextRequest) {
  if (!(await falladasSchemaReady())) {
    return NextResponse.json({ removed: 0 });
  }

  const body = await req.json().catch(() => ({}));
  const dispositivoId = deviceFrom(req, body);
  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }

  const ids = Array.isArray(body.preguntaIds)
    ? body.preguntaIds.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  try {
    const removed = await removeColaItems(dispositivoId, ids);
    const counts = await getColaCounts(dispositivoId);
    return NextResponse.json({ removed, counts });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar" },
      { status: 500 },
    );
  }
}
