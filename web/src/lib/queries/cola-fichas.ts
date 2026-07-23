import "server-only";

import { colaFichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";
import type { FichaCard } from "@/lib/queries/fichas";

function normalizeDeviceId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase().replace(/\s+/g, "");
  const jex = upper.replace(/[^A-Z0-9-]/g, "");
  const m = jex.match(/^JEX-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/);
  if (m) {
    const body = jex.replace(/^JEX-?/, "").replace(/-/g, "");
    if (body.length !== 8) return null;
    return `JEX-${body.slice(0, 4)}-${body.slice(4)}`;
  }

  if (trimmed.length < 8 || trimmed.length > 80) return null;
  if (!/^[\w.-]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function getColaFichasCount(dispositivoId: string): Promise<number> {
  if (!(await colaFichasSchemaReady())) return 0;
  const device = normalizeDeviceId(dispositivoId);
  if (!device) return 0;

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("cola_fichas")
    .select("*", { count: "exact", head: true })
    .eq("dispositivo_id", device);

  if (error) return 0;
  return count ?? 0;
}

export async function upsertColaFicha(
  dispositivoId: string,
  fichaId: string,
  mazoId?: string | null,
): Promise<void> {
  if (!(await colaFichasSchemaReady())) {
    throw new Error("Activa la cola de falladas/fichas en Material");
  }
  const device = normalizeDeviceId(dispositivoId);
  if (!device) throw new Error("dispositivoId inválido");

  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("cola_fichas")
    .select("veces")
    .eq("dispositivo_id", device)
    .eq("ficha_id", fichaId)
    .maybeSingle();

  const veces = (existing?.veces ? Number(existing.veces) : 0) + 1;
  const { error } = await supabase.from("cola_fichas").upsert(
    {
      dispositivo_id: device,
      ficha_id: fichaId,
      mazo_id: mazoId ?? null,
      veces,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dispositivo_id,ficha_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeColaFichas(
  dispositivoId: string,
  fichaIds: string[],
): Promise<number> {
  if (!(await colaFichasSchemaReady())) return 0;
  const device = normalizeDeviceId(dispositivoId);
  if (!device || !fichaIds.length) return 0;

  const supabase = getSupabase();
  const { error, count } = await supabase
    .from("cola_fichas")
    .delete({ count: "exact" })
    .eq("dispositivo_id", device)
    .in("ficha_id", fichaIds);

  if (error) throw new Error(error.message);
  return count ?? fichaIds.length;
}

export async function fetchColaFichasCards(
  dispositivoId: string,
  limit = 100,
): Promise<FichaCard[]> {
  if (!(await colaFichasSchemaReady())) return [];
  const device = normalizeDeviceId(dispositivoId);
  if (!device) return [];

  const supabase = getSupabase();
  const { data: cola, error: cErr } = await supabase
    .from("cola_fichas")
    .select("ficha_id")
    .eq("dispositivo_id", device)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (cErr || !cola?.length) return [];

  const ids = cola.map((r) => r.ficha_id as string);
  const { data: fichas, error: fErr } = await supabase
    .from("fichas")
    .select("id, frente, dorso, orden")
    .in("id", ids);

  if (fErr || !fichas?.length) return [];

  const byId = new Map(fichas.map((f) => [f.id as string, f]));
  const out: FichaCard[] = [];
  for (const id of ids) {
    const f = byId.get(id);
    if (!f) continue;
    out.push({
      id: f.id as string,
      frente: f.frente as string,
      dorso: f.dorso as string,
      orden: (f.orden as number) ?? 0,
    });
  }
  return out;
}
