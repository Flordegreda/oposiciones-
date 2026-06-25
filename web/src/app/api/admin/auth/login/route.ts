import { NextResponse } from "next/server";
import {
  adminSessionCookieOptions,
  createSessionToken,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import { verifyAdminCredentials } from "@/lib/admin-auth-password";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Administración desactivada: faltan ADMIN_USER y ADMIN_PASSWORD." },
      { status: 503 },
    );
  }

  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    username = body.username?.trim() ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Faltan usuario y contraseña" }, { status: 400 });
  }

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createSessionToken();
  if (!token) {
    return NextResponse.json({ error: "No se pudo crear la sesión" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  const opts = adminSessionCookieOptions(token);
  response.cookies.set(opts);
  return response;
}
