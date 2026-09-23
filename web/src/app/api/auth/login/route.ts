import { NextResponse } from "next/server";
import { checkPassword, ensureGate } from "@/lib/gate-store";
import { gateCookieHeader, gateSecret, signGateToken } from "@/lib/gate-cookie";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = gateSecret();
  if (!secret) {
    return NextResponse.json({ error: "Acceso no configurado" }, { status: 503 });
  }

  try {
    await ensureGate();
    const body = (await req.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña obligatorios" }, { status: 400 });
    }
    const ok = await checkPassword(username, password);
    if (!ok) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const token = await signGateToken(username.trim().toLowerCase(), secret);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", gateCookieHeader(token));
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al entrar" },
      { status: 500 },
    );
  }
}
