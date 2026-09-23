import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  GATE_PRINT_HEADER,
  gateSecret,
  readGateCookie,
  verifyGateToken,
} from "@/lib/gate-cookie";

const PUBLIC_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/verify",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/file.svg",
  "/sw.js",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/acceso") return true;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (pathname.startsWith("/icons/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const secret = gateSecret();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Acceso no configurado", { status: 503 });
  }

  const printKey = req.headers.get(GATE_PRINT_HEADER);
  if (printKey === secret && pathname.startsWith("/imprimir")) {
    return NextResponse.next();
  }

  const user = await verifyGateToken(readGateCookie(req.headers.get("cookie")), secret);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/") || pathname.startsWith("/rest/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/acceso";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
