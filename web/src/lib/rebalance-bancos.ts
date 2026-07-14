import "server-only";

import type { BackupBanco, BackupPregunta, BackupSupuesto } from "@/lib/import-backup";
import { insertBancoContent } from "@/lib/import-backup";
import { getSupabase } from "@/lib/supabase/server";
import { sortPreguntasWithSupuestos, type SupuestoRow } from "@/lib/supuesto-utils";
import type { PreguntaRow } from "@/lib/queries/bancos";
import { fetchPreguntaCountsByBanco, getMateriasWithCounts } from "@/lib/queries/bancos";
import { supuestosSchemaReady } from "@/lib/queries/schema";

export type RebalanceOptions = {
  targetSize?: number;
  materiaId?: string | null;
};

export type RebalanceChange = {
  accion: "partir" | "fusionar" | "igual";
  origen: string[];
  destino: string[];
  preguntas: number;
};

export type RebalanceMateriaPreview = {
  materiaId: string;
  materiaNombre: string;
  bancosAntes: number;
  bancosDespues: number;
  cambios: RebalanceChange[];
};

export type RebalancePreview = {
  targetSize: number;
  maxSize: number;
  minSize: number;
  materias: RebalanceMateriaPreview[];
  bancosAntes: number;
  bancosDespues: number;
  partir: number;
  fusionar: number;
  sinCambios: number;
};

type LoadedBanco = {
  id: string;
  nombre: string;
  tipo: string;
  materia_id: string;
  linea_id: string | null;
  active: boolean;
  preguntas: PreguntaRow[];
  supuestos: SupuestoRow[];
};

type PlannedBanco = BackupBanco & {
  linea_id: string | null;
  active: boolean;
  materia_id: string;
  sourceIds: string[];
};

function bounds(targetSize: number) {
  return {
    targetSize,
    maxSize: Math.round(targetSize * 1.25),
    minSize: Math.round(targetSize * 0.75),
  };
}

function toBackupPregunta(p: PreguntaRow): BackupPregunta {
  return {
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion,
    orden: p.orden,
    supuesto_id: p.supuesto_id,
  };
}

async function loadBancoFull(id: string): Promise<LoadedBanco | null> {
  const supabase = getSupabase();
  const { data: banco, error } = await supabase
    .from("bancos")
    .select("id, nombre, tipo, materia_id, active, linea_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!banco) return null;

  const { getBancoForAdmin } = await import("@/lib/queries/bancos");
  const data = await getBancoForAdmin(id);
  if (!data) return null;

  const supuestos: SupuestoRow[] = [];
  if (await supuestosSchemaReady()) {
    const { data: supRows } = await supabase
      .from("supuestos")
      .select("id, banco_id, titulo, texto, orden")
      .eq("banco_id", id)
      .order("orden");
    for (const s of supRows ?? []) supuestos.push(s as SupuestoRow);
  }

  return {
    id: banco.id,
    nombre: banco.nombre,
    tipo: banco.tipo,
    materia_id: banco.materia_id,
    linea_id: banco.linea_id,
    active: banco.active ?? true,
    preguntas: data.preguntas,
    supuestos,
  };
}

function hasSupuestoStructure(banco: LoadedBanco): boolean {
  return banco.supuestos.length > 0 || banco.preguntas.some((p) => p.supuesto_id);
}

type ContentBlock = {
  supuesto?: BackupSupuesto;
  preguntas: BackupPregunta[];
};

function buildContentBlocks(banco: LoadedBanco): ContentBlock[] {
  const supuestoById = new Map(banco.supuestos.map((s) => [s.id, s]));
  const sorted = sortPreguntasWithSupuestos(banco.preguntas, supuestoById);
  const blocks: ContentBlock[] = [];
  const supuestoBlocks = new Map<string, ContentBlock>();

  for (const p of sorted) {
    const row = toBackupPregunta(p);
    if (p.supuesto_id && supuestoById.has(p.supuesto_id)) {
      let block = supuestoBlocks.get(p.supuesto_id);
      if (!block) {
        const s = supuestoById.get(p.supuesto_id)!;
        block = {
          supuesto: {
            titulo: s.titulo,
            texto: s.texto,
            orden: s.orden,
            preguntas: [],
          },
          preguntas: [],
        };
        supuestoBlocks.set(p.supuesto_id, block);
        blocks.push(block);
      }
      block.supuesto!.preguntas!.push(row);
      block.preguntas.push(row);
      continue;
    }
    blocks.push({ preguntas: [row] });
  }

  return blocks;
}

function blocksToBackup(blocks: ContentBlock[]): Pick<BackupBanco, "preguntas" | "supuestos"> {
  const supuestos: BackupSupuesto[] = [];
  const sueltas: BackupPregunta[] = [];
  let sOrd = 0;
  let pOrd = 0;

  for (const block of blocks) {
    if (block.supuesto) {
      const preguntas = block.preguntas.map((p, i) => ({ ...p, orden: pOrd + i }));
      pOrd += preguntas.length;
      supuestos.push({
        ...block.supuesto,
        orden: sOrd++,
        preguntas,
      });
    } else {
      for (const p of block.preguntas) {
        sueltas.push({ ...p, orden: pOrd++ });
      }
    }
  }

  return { supuestos: supuestos.length ? supuestos : undefined, preguntas: sueltas };
}

function packBlocksIntoPlans(
  banco: LoadedBanco,
  blocks: ContentBlock[],
  targetSize: number,
  maxSize: number,
): PlannedBanco[] {
  const bins: ContentBlock[][] = [];
  let current: ContentBlock[] = [];
  let currentSize = 0;

  const flush = () => {
    if (!current.length) return;
    bins.push(current);
    current = [];
    currentSize = 0;
  };

  for (const block of blocks) {
    const size = block.preguntas.length;
    if (size > maxSize) {
      flush();
      bins.push([block]);
      continue;
    }
    if (currentSize > 0 && currentSize + size > maxSize) flush();
    current.push(block);
    currentSize += size;
  }
  flush();

  const total = bins.length;
  return bins.map((bin, idx) => {
    const content = blocksToBackup(bin);
    const nombre =
      total > 1 ? `${banco.nombre} (${idx + 1}/${total})` : banco.nombre;
    return {
      nombre,
      tipo: banco.tipo,
      materia_id: banco.materia_id,
      linea_id: banco.linea_id,
      active: banco.active,
      ...content,
      sourceIds: [banco.id],
    };
  });
}

function splitBanco(banco: LoadedBanco, targetSize: number, maxSize: number): PlannedBanco[] {
  if (hasSupuestoStructure(banco)) {
    return packBlocksIntoPlans(banco, buildContentBlocks(banco), targetSize, maxSize);
  }

  const sorted = [...banco.preguntas].sort((a, b) => a.orden - b.orden);
  const totalParts = Math.ceil(sorted.length / targetSize);
  const parts: PlannedBanco[] = [];

  for (let i = 0; i < sorted.length; i += targetSize) {
    const slice = sorted.slice(i, i + targetSize);
    const partNum = Math.floor(i / targetSize) + 1;
    parts.push({
      nombre: totalParts > 1 ? `${banco.nombre} (${partNum}/${totalParts})` : banco.nombre,
      tipo: banco.tipo,
      materia_id: banco.materia_id,
      linea_id: banco.linea_id,
      active: banco.active,
      preguntas: slice.map((p, ord) => ({ ...toBackupPregunta(p), orden: ord })),
      sourceIds: [banco.id],
    });
  }

  return parts;
}

function mergeBancos(group: LoadedBanco[]): PlannedBanco {
  const blocks: ContentBlock[] = [];
  for (const b of group) {
    blocks.push(...buildContentBlocks(b));
  }
  const content = blocksToBackup(blocks);
  const nombre =
    group.length === 1
      ? group[0].nombre
      : `${group[0].nombre} (+${group.length - 1} temas)`;

  return {
    nombre: nombre.slice(0, 180),
    tipo: group[0].tipo,
    materia_id: group[0].materia_id,
    linea_id: group[0].linea_id,
    active: group.every((b) => b.active),
    ...content,
    sourceIds: group.map((b) => b.id),
  };
}

function greedyMergeSmall(
  small: LoadedBanco[],
  targetSize: number,
  maxSize: number,
): PlannedBanco[] {
  const sorted = [...small].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
  const out: PlannedBanco[] = [];
  let group: LoadedBanco[] = [];
  let count = 0;

  const flushGroup = () => {
    if (!group.length) return;
    out.push(mergeBancos(group));
    group = [];
    count = 0;
  };

  for (const banco of sorted) {
    const n = banco.preguntas.length;
    if (count > 0 && count + n > maxSize) flushGroup();
    group.push(banco);
    count += n;
    if (count >= targetSize) flushGroup();
  }
  flushGroup();

  return out;
}

function rebalanceLoadedSubset(
  bancos: LoadedBanco[],
  targetSize: number,
  maxSize: number,
  minSize: number,
): { planned: PlannedBanco[]; cambios: RebalanceChange[] } {
  const planned: PlannedBanco[] = [];
  const cambios: RebalanceChange[] = [];
  const toMerge: LoadedBanco[] = [];

  for (const banco of bancos) {
    const n = banco.preguntas.length;
    if (n === 0) continue;

    if (n > maxSize) {
      const parts = splitBanco(banco, targetSize, maxSize);
      planned.push(...parts);
      cambios.push({
        accion: "partir",
        origen: [banco.nombre],
        destino: parts.map((p) => p.nombre),
        preguntas: n,
      });
      continue;
    }

    if (n < minSize) {
      toMerge.push(banco);
      continue;
    }

    cambios.push({
      accion: "igual",
      origen: [banco.nombre],
      destino: [banco.nombre],
      preguntas: n,
    });
  }

  if (toMerge.length) {
    const merged = greedyMergeSmall(toMerge, targetSize, maxSize);
    for (const plan of merged) {
      const sources = bancos.filter((b) => plan.sourceIds.includes(b.id));
      cambios.push({
        accion: "fusionar",
        origen: sources.map((b) => b.nombre),
        destino: [plan.nombre],
        preguntas: sources.reduce((a, b) => a + b.preguntas.length, 0),
      });
    }
    planned.push(...merged);
  }

  return { planned, cambios };
}

function rebalanceLoaded(
  bancos: LoadedBanco[],
  targetSize: number,
  maxSize: number,
  minSize: number,
): { planned: PlannedBanco[]; cambios: RebalanceChange[] } {
  const tipos = [...new Set(bancos.map((b) => b.tipo))];
  const planned: PlannedBanco[] = [];
  const cambios: RebalanceChange[] = [];

  for (const tipo of tipos) {
    const subset = bancos.filter((b) => b.tipo === tipo);
    const result = rebalanceLoadedSubset(subset, targetSize, maxSize, minSize);
    planned.push(...result.planned);
    cambios.push(...result.cambios);
  }

  return { planned, cambios };
}

async function loadMateriaBancos(materiaId: string): Promise<LoadedBanco[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bancos")
    .select("id")
    .eq("materia_id", materiaId)
    .order("nombre");

  if (error) throw error;

  const counts = await fetchPreguntaCountsByBanco((data ?? []).map((b) => b.id));
  const ids = (data ?? []).filter((b) => (counts.get(b.id) ?? 0) > 0).map((b) => b.id);

  const loaded: LoadedBanco[] = [];
  const BATCH = 8;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = await Promise.all(ids.slice(i, i + BATCH).map((id) => loadBancoFull(id)));
    for (const b of batch) {
      if (b?.preguntas.length) loaded.push(b);
    }
  }

  return loaded;
}

export async function previewRebalance(opts: RebalanceOptions = {}): Promise<RebalancePreview> {
  const targetSize = opts.targetSize ?? 50;
  const { maxSize, minSize } = bounds(targetSize);

  const materias = opts.materiaId
    ? (await getMateriasWithCounts()).filter((m) => m.id === opts.materiaId)
    : await getMateriasWithCounts();

  const previews: RebalanceMateriaPreview[] = [];
  let bancosAntes = 0;
  let bancosDespues = 0;
  let partir = 0;
  let fusionar = 0;
  let sinCambios = 0;

  for (const materia of materias) {
    const loaded = await loadMateriaBancos(materia.id);
    const antes = loaded.length;
    const { planned, cambios } = rebalanceLoaded(loaded, targetSize, maxSize, minSize);
    const unchanged = cambios.filter((c) => c.accion === "igual").length;
    const despues = unchanged + planned.length;

    bancosAntes += antes;
    bancosDespues += despues;
    partir += cambios.filter((c) => c.accion === "partir").length;
    fusionar += cambios.filter((c) => c.accion === "fusionar").length;
    sinCambios += cambios.filter((c) => c.accion === "igual").length;

    if (cambios.some((c) => c.accion !== "igual")) {
      previews.push({
        materiaId: materia.id,
        materiaNombre: materia.nombre,
        bancosAntes: antes,
        bancosDespues: despues,
        cambios: cambios.filter((c) => c.accion !== "igual"),
      });
    }
  }

  return {
    targetSize,
    maxSize,
    minSize,
    materias: previews,
    bancosAntes,
    bancosDespues,
    partir,
    fusionar,
    sinCambios,
  };
}

export async function executeRebalance(opts: RebalanceOptions = {}): Promise<RebalancePreview> {
  const preview = await previewRebalance(opts);
  if (!preview.partir && !preview.fusionar) return preview;

  const targetSize = opts.targetSize ?? 50;
  const { maxSize, minSize } = bounds(targetSize);
  const supabase = getSupabase();

  const materiaIds = opts.materiaId
    ? [opts.materiaId]
    : (await getMateriasWithCounts()).map((m) => m.id);

  const deleteIds = new Set<string>();

  for (const materiaId of materiaIds) {
    const loaded = await loadMateriaBancos(materiaId);
    const { planned } = rebalanceLoaded(loaded, targetSize, maxSize, minSize);
    if (!planned.length) continue;

    for (const plan of planned) {
      const { data: nuevo, error: bErr } = await supabase
        .from("bancos")
        .insert({
          nombre: plan.nombre.trim(),
          tipo: plan.tipo,
          materia_id: plan.materia_id,
          linea_id: plan.linea_id,
          active: plan.active ?? true,
        })
        .select("id")
        .single();

      if (bErr || !nuevo) throw new Error(bErr?.message ?? "Error al crear banco");

      try {
        await insertBancoContent(nuevo.id, plan, supabase);
      } catch (e) {
        await supabase.from("bancos").delete().eq("id", nuevo.id);
        throw e;
      }

      for (const sid of plan.sourceIds) deleteIds.add(sid);
    }
  }

  for (const id of deleteIds) {
    const { error } = await supabase.from("bancos").delete().eq("id", id);
    if (error) throw error;
  }

  return previewRebalance(opts);
}
