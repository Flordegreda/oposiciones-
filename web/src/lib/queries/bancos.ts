import { getSupabase } from "@/lib/supabase/server";
import { JEX_SLUG } from "@/lib/constants";
import type { PrintBundle, PrintablePregunta } from "@/lib/print-test";
import { preguntasTableExists, preguntasRpcReady, resumenesSchemaReady, supuestosSchemaReady, fichasSchemaReady } from "@/lib/queries/schema";
import {
  sortPreguntasWithSupuestos,
  type SupuestoRow,
} from "@/lib/supuesto-utils";

export type BancoRow = {
  id: string;
  nombre: string;
  tipo: string;
  materia_id: string;
  active?: boolean;
  linea_id?: string | null;
  materias: { nombre: string } | { nombre: string }[] | null;
  numPreguntas?: number;
};

export type PreguntaRow = {
  id: string;
  banco_id: string;
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion: string | null;
  orden: number;
  supuesto_id: string | null;
  supuesto_titulo?: string | null;
  supuesto_texto?: string | null;
};

export type MateriaSection = {
  id: string;
  nombre: string;
  bancos: BancoRow[];
};

export type TipoStats = {
  bancos: number;
  preguntas: number;
};

export type MateriaStatsRow = {
  id: string;
  nombre: string;
  bancos: number;
  preguntas: number;
  teorico: TipoStats;
  practico: TipoStats;
};

export type MaterialStats = {
  materias: number;
  bancos: number;
  preguntas: number;
  teorico: TipoStats;
  practico: TipoStats;
  /** Mazos de fichas Anki (0 si el esquema no está activo). */
  mazosFichas: number;
  /** Total de fichas pregunta/respuesta. */
  fichas: number;
  /** PDFs de resúmenes subidos. */
  resumenes: number;
  porMateria: MateriaStatsRow[];
};

const emptyTipoStats = (): TipoStats => ({ bancos: 0, preguntas: 0 });

const PAGE_SIZE = 1000;

export async function getJexLineaId(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("lineas")
    .select("id")
    .eq("slug", JEX_SLUG)
    .maybeSingle();
  return data?.id ?? null;
}

export function materiaNombre(m: BancoRow["materias"]): string {
  if (!m) return "Sin materia";
  if (Array.isArray(m)) return m[0]?.nombre ?? "Sin materia";
  return m.nombre;
}

export function sortBancosByNombre(bancos: BancoRow[]): BancoRow[] {
  return [...bancos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}

function attachPreguntaCounts(
  rows: BancoRow[],
  counts: Map<string, number>,
): BancoRow[] {
  return rows.map((b) => ({ ...b, numPreguntas: counts.get(b.id) ?? 0 }));
}

/** Cuenta preguntas por banco (RPC rápido o plan B en paralelo). */
export async function fetchPreguntaCountsByBanco(
  bancoIds?: string[],
): Promise<Map<string, number>> {
  const filter = bancoIds?.length ? new Set(bancoIds) : null;
  const supabase = getSupabase();

  const { data: rpcData, error: rpcError } = await supabase.rpc("preguntas_counts_by_banco");

  if (!rpcError && Array.isArray(rpcData)) {
    const tally = new Map<string, number>();
    for (const row of rpcData as { banco_id: string; cnt: number | string }[]) {
      if (filter && !filter.has(row.banco_id)) continue;
      tally.set(row.banco_id, Number(row.cnt) || 0);
    }
    if (filter) {
      for (const id of filter) {
        if (!tally.has(id)) tally.set(id, 0);
      }
    }
    return tally;
  }

  // Sin RPC: un barrido paginado (mejor que N consultas count por banco).
  const tally = await fetchPreguntaCountsParallel();
  if (!filter) return tally;

  const filtered = new Map<string, number>();
  for (const id of filter) {
    filtered.set(id, tally.get(id) ?? 0);
  }
  return filtered;
}

async function fetchPreguntaCountsParallel(): Promise<Map<string, number>> {
  const tally = new Map<string, number>();
  const supabase = getSupabase();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("preguntas")
      .select("banco_id")
      .order("banco_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      tally.set(row.banco_id, (tally.get(row.banco_id) ?? 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
  }

  return tally;
}

async function fetchSupuestosForBancos(bancoIds: string[]): Promise<Map<string, SupuestoRow>> {
  const map = new Map<string, SupuestoRow>();
  if (!bancoIds.length || !(await supuestosSchemaReady())) return map;

  const supabase = getSupabase();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("supuestos")
      .select("id, banco_id, titulo, texto, orden")
      .in("banco_id", bancoIds)
      .order("orden")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;
    for (const row of data as SupuestoRow[]) map.set(row.id, row);
    if (data.length < PAGE_SIZE) break;
  }

  return map;
}

const PREGUNTA_SELECT_BASE =
  "id, banco_id, enunciado, opciones, respuesta, explicacion, orden";
const PREGUNTA_SELECT_WITH_SUPUESTO = `${PREGUNTA_SELECT_BASE}, supuesto_id`;

async function fetchPreguntasForBanco(bancoId: string): Promise<PreguntaRow[]> {
  const supabase = getSupabase();
  const rows: PreguntaRow[] = [];
  const withSupuesto = await supuestosSchemaReady();

  for (let from = 0; ; from += PAGE_SIZE) {
    let batchLen = 0;

    if (withSupuesto) {
      const { data, error } = await supabase
        .from("preguntas")
        .select(PREGUNTA_SELECT_WITH_SUPUESTO)
        .eq("banco_id", bancoId)
        .order("orden")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;
      batchLen = data.length;

      rows.push(
        ...data.map((p) => ({
          ...p,
          opciones: p.opciones as string[],
          supuesto_id: p.supuesto_id ?? null,
        })),
      );
    } else {
      const { data, error } = await supabase
        .from("preguntas")
        .select(PREGUNTA_SELECT_BASE)
        .eq("banco_id", bancoId)
        .order("orden")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;
      batchLen = data.length;

      rows.push(
        ...data.map((p) => ({
          ...p,
          opciones: p.opciones as string[],
          supuesto_id: null,
        })),
      );
    }

    if (batchLen < PAGE_SIZE) break;
  }

  if (!withSupuesto) return rows;

  const supuestoById = await fetchSupuestosForBancos([bancoId]);
  const sorted = sortPreguntasWithSupuestos(rows, supuestoById);
  const fallback = supuestoById.size === 1 ? [...supuestoById.values()][0] : null;

  return sorted.map((p) => {
    const linked = p.supuesto_id ? supuestoById.get(p.supuesto_id) : undefined;
    const sup = linked ?? fallback;
    return {
      ...p,
      supuesto_id: p.supuesto_id ?? sup?.id ?? null,
      supuesto_titulo: sup?.titulo ?? null,
      supuesto_texto: sup?.texto ?? null,
    };
  });
}

function groupByMateria(rows: BancoRow[]): MateriaSection[] {
  const map = new Map<string, MateriaSection>();
  for (const b of rows) {
    const key = b.materia_id;
    const nombre = materiaNombre(b.materias);
    if (!map.has(key)) map.set(key, { id: key, nombre, bancos: [] });
    map.get(key)!.bancos.push(b);
  }
  return [...map.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
    .map((section) => ({
      ...section,
      bancos: sortBancosByNombre(section.bancos),
    }));
}

async function queryBancosForPracticar() {
  const supabase = getSupabase();
  const jexId = await getJexLineaId();

  let query = supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, linea_id, materias(nombre)")
    .order("nombre");
  if (jexId) {
    query = query.or(`linea_id.is.null,linea_id.eq.${jexId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BancoRow[];
}

/** Temario único jurídicas JEX: bancos con preguntas (legacy común + JEX). */
export async function getPracticarDataUncached() {
  const rows = await queryBancosForPracticar();
  const hasPreguntas = await preguntasTableExists();
  const counts = hasPreguntas
    ? await fetchPreguntaCountsByBanco(rows.map((b) => b.id))
    : new Map<string, number>();

  const withCounts = attachPreguntaCounts(rows, counts);
  const practicables = hasPreguntas
    ? withCounts.filter((b) => (b.numPreguntas ?? 0) > 0)
    : withCounts;

  return {
    sections: groupByMateria(practicables),
  };
}

export async function getBancoForAdmin(id: string) {
  const supabase = getSupabase();
  const { data: banco, error } = await supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, materias(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!banco) return null;

  let preguntas: PreguntaRow[] = [];
  const hasPreguntas = await preguntasTableExists();
  if (hasPreguntas) {
    preguntas = await fetchPreguntasForBanco(id);
  }

  return { banco: banco as BancoRow, preguntas };
}

export async function getMateriasWithCounts() {
  const supabase = getSupabase();
  const { data: materias, error } = await supabase
    .from("materias")
    .select("id, nombre")
    .order("nombre");
  if (error) throw error;

  const { data: counts, error: cErr } = await supabase.from("bancos").select("materia_id");
  if (cErr) throw cErr;

  return buildMateriasWithCounts(materias ?? [], counts ?? []);
}

function buildMateriasWithCounts(
  materias: { id: string; nombre: string }[],
  bancos: { materia_id: string }[],
) {
  const tally = new Map<string, number>();
  for (const row of bancos) {
    tally.set(row.materia_id, (tally.get(row.materia_id) ?? 0) + 1);
  }

  return materias.map((m) => ({
    ...m,
    bancos: tally.get(m.id) ?? 0,
  }));
}

function buildMaterialStats(
  materias: { id: string; nombre: string }[],
  bancos: { id: string; materia_id: string; tipo: string }[],
  counts: Map<string, number>,
): MaterialStats {
  const materiaMap = new Map<string, MateriaStatsRow>();
  for (const m of materias) {
    materiaMap.set(m.id, {
      id: m.id,
      nombre: m.nombre,
      bancos: 0,
      preguntas: 0,
      teorico: emptyTipoStats(),
      practico: emptyTipoStats(),
    });
  }

  const totals: MaterialStats = {
    materias: materias.length,
    bancos: bancos.length,
    preguntas: 0,
    teorico: emptyTipoStats(),
    practico: emptyTipoStats(),
    mazosFichas: 0,
    fichas: 0,
    resumenes: 0,
    porMateria: [],
  };

  for (const b of bancos) {
    const n = counts.get(b.id) ?? 0;
    const tipo = b.tipo === "practico" ? "practico" : "teorico";
    totals.preguntas += n;
    totals[tipo].bancos += 1;
    totals[tipo].preguntas += n;

    let row = materiaMap.get(b.materia_id);
    if (!row) {
      row = {
        id: b.materia_id,
        nombre: "Sin materia",
        bancos: 0,
        preguntas: 0,
        teorico: emptyTipoStats(),
        practico: emptyTipoStats(),
      };
      materiaMap.set(b.materia_id, row);
    }

    row.bancos += 1;
    row.preguntas += n;
    row[tipo].bancos += 1;
    row[tipo].preguntas += n;
  }

  totals.porMateria = [...materiaMap.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );

  return totals;
}

export type AdminPageData = {
  bancos: BancoRow[];
  materias: { id: string; nombre: string; bancos: number }[];
  stats: MaterialStats;
  schemaOk: boolean;
  supuestosOk: boolean;
  preguntasRpcOk: boolean;
  resumenesOk: boolean;
  fichasOk: boolean;
};

/** Una sola pasada: bancos + materias + stats (evita consultas duplicadas en /admin). */
export async function getAdminPageDataUncached(): Promise<AdminPageData> {
  const supabase = getSupabase();

  const [
    schemaOk,
    supuestosOk,
    preguntasRpcOk,
    resumenesOk,
    fichasOk,
    materiasRes,
    bancosRes,
  ] = await Promise.all([
    preguntasTableExists(),
    supuestosSchemaReady(),
    preguntasRpcReady(),
    resumenesSchemaReady(),
    fichasSchemaReady(),
    supabase.from("materias").select("id, nombre").order("nombre"),
    supabase
      .from("bancos")
      .select("id, nombre, tipo, materia_id, active, linea_id, materias(nombre)")
      .order("nombre"),
  ]);

  if (materiasRes.error) throw materiasRes.error;
  if (bancosRes.error) throw bancosRes.error;

  const materias = materiasRes.data ?? [];
  const bancos = (bancosRes.data ?? []) as unknown as BancoRow[];
  const counts = schemaOk
    ? await fetchPreguntaCountsByBanco(bancos.map((b) => b.id))
    : new Map<string, number>();

  const stats = buildMaterialStats(materias, bancos, counts);
  const extras: Promise<void>[] = [];
  if (fichasOk) {
    extras.push(
      (async () => {
        const supabaseCounts = getSupabase();
        const [mazosRes, fichasRes] = await Promise.all([
          supabaseCounts.from("mazos_fichas").select("*", { count: "exact", head: true }),
          supabaseCounts.from("fichas").select("*", { count: "exact", head: true }),
        ]);
        stats.mazosFichas = mazosRes.count ?? 0;
        stats.fichas = fichasRes.count ?? 0;
      })(),
    );
  }
  if (resumenesOk) {
    extras.push(
      (async () => {
        const { count } = await getSupabase()
          .from("materia_resumenes")
          .select("*", { count: "exact", head: true });
        stats.resumenes = count ?? 0;
      })(),
    );
  }
  if (extras.length) await Promise.all(extras);

  return {
    bancos: sortBancosByNombre(attachPreguntaCounts(bancos, counts)),
    materias: buildMateriasWithCounts(materias, bancos),
    stats,
    schemaOk,
    supuestosOk,
    preguntasRpcOk,
    resumenesOk,
    fichasOk,
  };
}

function mapPrintablePregunta(p: PreguntaRow): PrintablePregunta {
  return {
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion,
    supuestoId: p.supuesto_id,
    supuestoTitulo: p.supuesto_titulo,
    supuestoTexto: p.supuesto_texto,
  };
}

function printSupuestosFromRows(rows: PreguntaRow[]): PrintBundle["sections"][number]["supuestos"] {
  const seen = new Set<string>();
  const out: NonNullable<PrintBundle["sections"][number]["supuestos"]> = [];
  for (const p of rows) {
    const texto = p.supuesto_texto?.trim();
    if (!texto) continue;
    const key = p.supuesto_id ?? texto;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: p.supuesto_id, titulo: p.supuesto_titulo, texto });
  }
  return out;
}

function buildPrintSection(
  banco: { id: string; nombre: string; tipo: string },
  rows: PreguntaRow[],
): PrintBundle["sections"][number] {
  return {
    bancoId: banco.id,
    bancoNombre: banco.nombre,
    tipo: banco.tipo,
    preguntas: rows.map(mapPrintablePregunta),
    supuestos: printSupuestosFromRows(rows),
  };
}

export async function getPrintBundleForMateria(materiaId: string): Promise<PrintBundle> {
  const supabase = getSupabase();
  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id, nombre")
    .eq("id", materiaId)
    .single();

  if (mErr || !materia) throw new Error("Materia no encontrada");

  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, tipo")
    .eq("materia_id", materiaId)
    .order("nombre");

  if (bErr) throw bErr;

  const hasPreguntas = await preguntasTableExists();
  const sections: PrintBundle["sections"] = [];
  let totalPreguntas = 0;

  for (const b of bancos ?? []) {
    if (!hasPreguntas) continue;
    const rows = await fetchPreguntasForBanco(b.id);
    if (!rows.length) continue;

    const preguntas = rows.map(mapPrintablePregunta);
    totalPreguntas += preguntas.length;
    sections.push(buildPrintSection(b, rows));
  }

  return {
    title: materia.nombre,
    subtitle: `${sections.length} banco(s) · ${totalPreguntas} pregunta(s)`,
    sections,
    totalPreguntas,
  };
}

export async function getPrintBundleForBanco(bancoId: string): Promise<PrintBundle> {
  const supabase = getSupabase();
  const { data: banco, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, tipo")
    .eq("id", bancoId)
    .single();

  if (bErr || !banco) throw new Error("Banco no encontrado");

  const hasPreguntas = await preguntasTableExists();
  if (!hasPreguntas) {
    return { title: banco.nombre, subtitle: "0 preguntas", sections: [], totalPreguntas: 0 };
  }

  const rows = await fetchPreguntasForBanco(bancoId);
  const section = buildPrintSection(banco, rows);

  return {
    title: banco.nombre,
    subtitle: `${section.preguntas.length} pregunta${section.preguntas.length !== 1 ? "s" : ""}`,
    sections: [section],
    totalPreguntas: section.preguntas.length,
  };
}

export type BrokenBancoRow = {
  id: string;
  nombre: string;
  reason: "empty" | "orphan";
};

/** Bancos sin preguntas o con materia inexistente (enlace roto en Tests). */
export async function findBrokenBancoIds(): Promise<BrokenBancoRow[]> {
  const supabase = getSupabase();
  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, materia_id")
    .order("nombre");

  if (bErr) throw bErr;

  const { data: materias, error: mErr } = await supabase.from("materias").select("id");
  if (mErr) throw mErr;

  const materiaIds = new Set((materias ?? []).map((m) => m.id));
  const counts = await fetchPreguntaCountsByBanco();
  const broken = new Map<string, BrokenBancoRow>();

  for (const b of bancos ?? []) {
    if (!materiaIds.has(b.materia_id)) {
      broken.set(b.id, { id: b.id, nombre: b.nombre, reason: "orphan" });
      continue;
    }
    if ((counts.get(b.id) ?? 0) === 0) {
      broken.set(b.id, { id: b.id, nombre: b.nombre, reason: "empty" });
    }
  }

  return [...broken.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}

export type JunkBancoRow = {
  id: string;
  nombre: string;
  numPreguntas: number;
  reason: "stub" | "duplicate";
};

/** Bancos de prueba (≤ maxPreguntas) y duplicados por nombre+materia (conserva el más completo). */
export async function findJunkBancoIds(maxStubPreguntas = 1): Promise<JunkBancoRow[]> {
  const supabase = getSupabase();
  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre, materia_id")
    .order("nombre");

  if (bErr) throw bErr;

  const counts = await fetchPreguntaCountsByBanco();
  const junk = new Map<string, JunkBancoRow>();

  for (const b of bancos ?? []) {
    const n = counts.get(b.id) ?? 0;
    if (n > 0 && n <= maxStubPreguntas) {
      junk.set(b.id, { id: b.id, nombre: b.nombre, numPreguntas: n, reason: "stub" });
    }
  }

  const groups = new Map<string, { id: string; nombre: string; numPreguntas: number }[]>();
  for (const b of bancos ?? []) {
    const key = `${b.materia_id}::${b.nombre.trim().toLowerCase()}`;
    const row = { id: b.id, nombre: b.nombre, numPreguntas: counts.get(b.id) ?? 0 };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    list.sort((a, b) => b.numPreguntas - a.numPreguntas || a.id.localeCompare(b.id));
    for (const loser of list.slice(1)) {
      junk.set(loser.id, {
        id: loser.id,
        nombre: loser.nombre,
        numPreguntas: loser.numPreguntas,
        reason: "duplicate",
      });
    }
  }

  return [...junk.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}
