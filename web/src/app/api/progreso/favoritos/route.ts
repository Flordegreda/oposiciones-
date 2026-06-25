import { NextRequest, NextResponse } from "next/server";
import { listFavoritos, syncFavoritos, toggleFavoritoDb } from "@/lib/queries/favoritos";
import { favoritosTableExists } from "@/lib/queries/schema";

export async function GET() {
  try {
    const ready = await favoritosTableExists();
    if (!ready) return NextResponse.json({ ready: false, favoritos: [] });

    const favoritos = await listFavoritos();
    return NextResponse.json({ ready: true, favoritos });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.favoritos)) {
      const ready = await favoritosTableExists();
      if (!ready) return NextResponse.json({ ok: false, reason: "tabla_favoritos" }, { status: 503 });
      const inserted = await syncFavoritos(body.favoritos);
      return NextResponse.json({ ok: true, inserted });
    }

    const { bancoId, preguntaId } = body;
    if (!bancoId || !preguntaId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const isFav = await toggleFavoritoDb(bancoId, preguntaId);
    return NextResponse.json({ ok: true, isFavorito: isFav });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
