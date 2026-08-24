import { NextRequest, NextResponse } from "next/server";
import { splitMazoIntoTandas } from "@/lib/rebalance-fichas";
import { FICHAS_MAX_POR_MAZO } from "@/lib/split-fichas-mazo";
import { fichasSchemaReady } from "@/lib/queries/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  try {
    const { sizes, base } = await splitMazoIntoTandas(id, FICHAS_MAX_POR_MAZO);
    return NextResponse.json({
      ok: true,
      mazosCreated: sizes.length - 1,
      message: `Mazo «${base}» dividido en ${sizes.length} partes (${sizes.join(" + ")} fichas).`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al dividir";
    const status = message.includes("no encontrado")
      ? 404
      : message.includes("sin dividir")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
