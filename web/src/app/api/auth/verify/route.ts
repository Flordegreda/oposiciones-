import { NextResponse } from "next/server";
import { GATE_PRINT_HEADER, gateSecret, readGateCookie, verifyGateToken } from "@/lib/gate-cookie";

export async function GET(req: Request) {
  const secret = gateSecret();
  if (!secret) return new NextResponse(null, { status: 401 });

  if (req.headers.get(GATE_PRINT_HEADER) === secret) {
    return new NextResponse(null, { status: 200 });
  }

  const user = await verifyGateToken(readGateCookie(req.headers.get("cookie")), secret);
  if (!user) return new NextResponse(null, { status: 401 });
  return new NextResponse(null, { status: 200 });
}
