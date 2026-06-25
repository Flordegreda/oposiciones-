import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  isAdminAuthConfigured,
  verifySessionToken,
} from "@/lib/admin-auth";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    if (pathname === "/admin/login") {
      const token = request.cookies.get(ADMIN_COOKIE)?.value;
      if (isAdminAuthConfigured() && (await verifySessionToken(token))) {
        const next = request.nextUrl.searchParams.get("next") || "/admin";
        return NextResponse.redirect(new URL(next, request.url));
      }
    }
    return NextResponse.next();
  }

  if (!isAdminAuthConfigured()) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Administración desactivada: faltan ADMIN_USER y ADMIN_PASSWORD." },
        { status: 503 },
      );
    }
    return new NextResponse(
      "Administración desactivada. Configura ADMIN_USER y ADMIN_PASSWORD en el servidor.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
