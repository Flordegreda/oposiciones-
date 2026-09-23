import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getSupabase } from "@/lib/supabase/server";

const scrypt = promisify(scryptCb);

type SiteGateRow = {
  username: string;
  password_hash: string;
};

function normalizeUser(s: string): string {
  return s.trim().toLowerCase();
}

async function hashSecret(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const buf = (await scrypt(plain, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${buf.toString("base64url")}`;
}

async function verifySecret(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  const buf = (await scrypt(plain, salt, expected.length)) as Buffer;
  if (buf.length !== expected.length) return false;
  return timingSafeEqual(buf, expected);
}

async function loadGate(): Promise<SiteGateRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_gate")
    .select("username, password_hash")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureGate(): Promise<SiteGateRow> {
  const existing = await loadGate();
  if (existing) return existing;

  const initial = process.env.SITE_INITIAL_PASSWORD;
  if (!initial) {
    throw new Error("Falta SITE_INITIAL_PASSWORD para crear el acceso inicial");
  }
  const username = process.env.SITE_INITIAL_USER?.trim() || "thomas";
  const password_hash = await hashSecret(initial);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_gate")
    .upsert({
      id: 1,
      username: normalizeUser(username),
      password_hash,
    })
    .select("username, password_hash")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el acceso");
  return data;
}

export async function checkPassword(username: string, password: string): Promise<boolean> {
  const row = await ensureGate();
  if (normalizeUser(username) !== normalizeUser(row.username)) return false;
  return verifySecret(password, row.password_hash);
}
