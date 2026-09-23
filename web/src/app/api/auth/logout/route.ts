import { NextResponse } from "next/server";
import { clearGateCookieHeader } from "@/lib/gate-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearGateCookieHeader());
  return res;
}
