/** Cookie de sesión admin (httpOnly). */
export const ADMIN_COOKIE = "opos_jex_admin";

/** Duración de sesión en segundos (7 días). */
export const ADMIN_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER?.length && process.env.ADMIN_PASSWORD?.length);
}

function getSigningSecret(): string | null {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return null;
  return `${user}:${password}`;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = String(exp);
  const sig = await signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = getSigningSecret();
  if (!secret) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number.parseInt(payload, 10);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;

  const expected = await signPayload(payload, secret);
  return timingSafeEqual(sig, expected);
}

export function adminSessionCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
