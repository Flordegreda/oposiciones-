import { NextRequest, NextResponse } from "next/server";
import { colaFichasSchemaReady } from "@/lib/queries/schema";
import {
  fetchColaFichasCards,
  getColaFichasCount,
  removeColaFichas,
  upsertColaFicha,
} from "@/lib/queries/cola-fichas";

function deviceFrom(req: NextRequest, body?: { dispositivoId?: string }): string | null {
  return (body?.dispositivoId || req.headers.get("x-dispositivo-id") || "").trim() || null;
}

export async function GET(req: NextRequest) {
  if (!(await colaFichasSchemaReady())) {
    return NextResponse.json({ ready: false, total: 0, fichas: [] });
  }

  const dispositivoId = req.nextUrl.searchParams.get("dispositivoId")?.trim();
  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }

  const withCards = req.nextUrl.searchParams.get("fichas") === "1";
  const total = await getColaFichasCount(dispositivoId);
  if (!withCards) {
    return NextResponse.json({ ready: true, total });
  }

  const fichas = await fetchColaFichasCards(dispositivoId);
  return NextResponse.json({ ready: true, total, fichas });
}

/** Marca una ficha como «No sé». */
export async function POST(req: NextRequest) {
  if (!(await colaFichasSchemaReady())) {
    return NextResponse.json(
      { error: "Activa la cola en Material (tarjeta Cola de falladas)" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const dispositivoId = deviceFrom(req, body);
  const fichaId = String(body.fichaId ?? "").trim();
  const mazoId =
    typeof body.mazoId === "string" && body.mazoId.trim() ? body.mazoId.trim() : null;

  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }
  if (!fichaId) {
    return NextResponse.json({ error: "Falta fichaId" }, { status: 400 });
  }

  try {
    await upsertColaFicha(dispositivoId, fichaId, mazoId);
    const total = await getColaFichasCount(dispositivoId);
    return NextResponse.json({ ok: true, total });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

/** «Sé» → quita de la cola. */
export async function DELETE(req: NextRequest) {
  if (!(await colaFichasSchemaReady())) {
    return NextResponse.json({ removed: 0 });
  }

  const body = await req.json().catch(() => ({}));
  const dispositivoId = deviceFrom(req, body);
  if (!dispositivoId) {
    return NextResponse.json({ error: "Falta dispositivoId" }, { status: 400 });
  }

  const ids = Array.isArray(body.fichaIds)
    ? body.fichaIds.map((x: unknown) => String(x).trim()).filter(Boolean)
    : typeof body.fichaId === "string"
      ? [body.fichaId.trim()].filter(Boolean)
      : [];

  try {
    const removed = await removeColaFichas(dispositivoId, ids);
    const total = await getColaFichasCount(dispositivoId);
    return NextResponse.json({ removed, total });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
