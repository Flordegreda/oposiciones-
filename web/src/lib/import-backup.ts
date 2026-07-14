import { getSupabase } from "@/lib/supabase/server";
import { supuestosSchemaReady } from "@/lib/queries/schema";

export type ImportMode = "append" | "overwrite";

export type BackupPregunta = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string | null;
  orden?: number;
  supuesto_id?: string | null;
};

export type BackupSupuesto = {
  id?: string;
  titulo?: string | null;
  texto: string;
  orden?: number;
  preguntas?: BackupPregunta[];
};

export type BackupBanco = {
  id?: string;
  nombre: string;
  tipo?: string;
  active?: boolean;
  linea_id?: string | null;
  materia_id?: string;
  supuestos?: BackupSupuesto[];
  preguntas?: BackupPregunta[];
};

export type BackupMateria = {
  id?: string;
  nombre: string;
  bancos?: BackupBanco[];
};

export type BackupBody = {
  format?: string;
  materias?: BackupMateria[];
};

export type ImportPreview = {
  materias: number;
  bancosNuevos: number;
  bancosExistentes: number;
  bancosVacios: number;
  preguntasNuevas: number;
  preguntasSobrescritura: number;
  preguntasTotales: number;
};

type BancoExisting = { id: string; nombre: string; materia_id: string };

async function loadExistingBancos(): Promise<BancoExisting[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("bancos").select("id, nombre, materia_id");
  if (error) throw error;
  return data ?? [];
}

async function resolveMateriaId(
  materia: BackupMateria,
  supabase: ReturnType<typeof getSupabase>,
): Promise<{ id: string; created: boolean }> {
  if (materia.id) {
    const { data } = await supabase.from("materias").select("id").eq("id", materia.id).maybeSingle();
    if (data) return { id: data.id, created: false };
  }

  const { data: byName } = await supabase
    .from("materias")
    .select("id")
    .eq("nombre", materia.nombre.trim())
    .maybeSingle();
  if (byName) return { id: byName.id, created: false };

  const { data: created, error } = await supabase
    .from("materias")
    .insert({ nombre: materia.nombre.trim() })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Error al crear materia");
  return { id: created.id, created: true };
}

function findExistingBancoId(
  banco: BackupBanco,
  materiaId: string,
  existing: BancoExisting[],
): string | null {
  if (banco.id) {
    const byId = existing.find((b) => b.id === banco.id);
    if (byId) return byId.id;
  }
  const byName = existing.find(
    (b) => b.materia_id === materiaId && b.nombre === banco.nombre.trim(),
  );
  return byName?.id ?? null;
}

async function deleteBancoContent(bancoId: string) {
  const supabase = getSupabase();
  await supabase.from("preguntas").delete().eq("banco_id", bancoId);
  if (await supuestosSchemaReady()) {
    await supabase.from("supuestos").delete().eq("banco_id", bancoId);
  }
}

export async function insertBancoContent(
  bancoId: string,
  banco: BackupBanco,
  supabase: ReturnType<typeof getSupabase>,
) {
  const hasSupuestos = (banco.supuestos?.length ?? 0) > 0;
  if (hasSupuestos && !(await supuestosSchemaReady())) {
    throw new Error("El backup incluye supuestos pero falta la tabla supuestos en la base de datos");
  }

  let orden = 0;

  if (hasSupuestos) {
    for (let sIdx = 0; sIdx < (banco.supuestos?.length ?? 0); sIdx++) {
      const sup = banco.supuestos![sIdx];
      const { data: supuesto, error: sErr } = await supabase
        .from("supuestos")
        .insert({
          banco_id: bancoId,
          titulo: sup.titulo ?? null,
          texto: sup.texto,
          orden: sup.orden ?? sIdx,
        })
        .select("id")
        .single();
      if (sErr || !supuesto) throw new Error(sErr?.message ?? "Error al crear supuesto");

      const rows = (sup.preguntas ?? []).map((p) => ({
        banco_id: bancoId,
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuesta: p.respuesta,
        explicacion: p.explicacion ?? null,
        orden: orden++,
        supuesto_id: supuesto.id,
      }));
      if (rows.length) {
        const { error: pErr } = await supabase.from("preguntas").insert(rows);
        if (pErr) throw new Error(pErr.message);
      }
    }
  }

  const sueltas = hasSupuestos
    ? (banco.preguntas ?? [])
    : (banco.preguntas ?? []);

  if (sueltas.length) {
    const rows = sueltas.map((p, i) => ({
      banco_id: bancoId,
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta: p.respuesta,
      explicacion: p.explicacion ?? null,
      orden: p.orden ?? orden + i,
      ...(p.supuesto_id ? { supuesto_id: p.supuesto_id } : {}),
    }));
    const { error: pErr } = await supabase.from("preguntas").insert(rows);
    if (pErr) throw new Error(pErr.message);
  }
}

export async function previewImport(body: BackupBody, mode: ImportMode): Promise<ImportPreview> {
  const existing = await loadExistingBancos();
  const supabase = getSupabase();
  const { data: materiasDb } = await supabase.from("materias").select("id, nombre");
  const byMateriaName = new Map<string, string>();
  for (const m of materiasDb ?? []) byMateriaName.set(m.nombre.trim(), m.id);

  let bancosNuevos = 0;
  let bancosExistentes = 0;
  let bancosVacios = 0;
  let preguntasNuevas = 0;
  let preguntasSobrescritura = 0;
  const materiaNames = new Set<string>();

  for (const materia of body.materias ?? []) {
    if (!materia.nombre?.trim()) continue;
    materiaNames.add(materia.nombre.trim());

    const materiaId =
      (materia.id && existing.some((b) => b.materia_id === materia.id)
        ? materia.id
        : byMateriaName.get(materia.nombre.trim())) ?? null;

    for (const banco of materia.bancos ?? []) {
      if (!banco.nombre?.trim()) continue;
      const preguntas = [
        ...(banco.preguntas ?? []),
        ...(banco.supuestos ?? []).flatMap((s) => s.preguntas ?? []),
      ];
      if (!preguntas.length) {
        bancosVacios++;
        continue;
      }

      const existingId = materiaId
        ? findExistingBancoId(banco, materiaId, existing)
        : banco.id
          ? (existing.find((b) => b.id === banco.id)?.id ?? null)
          : null;

      if (existingId) {
        bancosExistentes++;
        if (mode === "overwrite") preguntasSobrescritura += preguntas.length;
      } else {
        bancosNuevos++;
        preguntasNuevas += preguntas.length;
      }
    }
  }

  return {
    materias: materiaNames.size,
    bancosNuevos,
    bancosExistentes,
    bancosVacios,
    preguntasNuevas,
    preguntasSobrescritura,
    preguntasTotales:
      mode === "overwrite" ? preguntasNuevas + preguntasSobrescritura : preguntasNuevas,
  };
}

export async function runImport(body: BackupBody, mode: ImportMode) {
  const supabase = getSupabase();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let materiasCreated = 0;
  const existing = await loadExistingBancos();

  for (const materia of body.materias ?? []) {
    if (!materia.nombre?.trim()) continue;

    const { id: materiaId, created } = await resolveMateriaId(materia, supabase);
    if (created) materiasCreated++;

    for (const banco of materia.bancos ?? []) {
      if (!banco.nombre?.trim()) continue;
      const preguntas = [
        ...(banco.preguntas ?? []),
        ...(banco.supuestos ?? []).flatMap((s) => s.preguntas ?? []),
      ];
      if (!preguntas.length) {
        skipped++;
        continue;
      }

      const existingId = findExistingBancoId(banco, materiaId, existing);

      if (existingId && mode === "append") {
        skipped++;
        continue;
      }

      if (existingId && mode === "overwrite") {
        const { error: uErr } = await supabase
          .from("bancos")
          .update({
            nombre: banco.nombre.trim(),
            tipo: banco.tipo ?? "teorico",
            active: banco.active ?? true,
            linea_id: banco.linea_id ?? null,
            materia_id: materiaId,
          })
          .eq("id", existingId);
        if (uErr) throw new Error(uErr.message);

        await deleteBancoContent(existingId);
        await insertBancoContent(existingId, banco, supabase);
        updated++;
        continue;
      }

      const { data: newBanco, error: bErr } = await supabase
        .from("bancos")
        .insert({
          nombre: banco.nombre.trim(),
          tipo: banco.tipo ?? "teorico",
          active: banco.active ?? true,
          linea_id: banco.linea_id ?? null,
          materia_id: materiaId,
        })
        .select("id")
        .single();

      if (bErr || !newBanco) throw new Error(bErr?.message ?? "Error al crear banco");

      try {
        await insertBancoContent(newBanco.id, banco, supabase);
      } catch (e) {
        await supabase.from("bancos").delete().eq("id", newBanco.id);
        throw e;
      }

      inserted++;
      existing.push({
        id: newBanco.id,
        nombre: banco.nombre.trim(),
        materia_id: materiaId,
      });
    }
  }

  return { inserted, updated, skipped, materiasCreated, mode };
}
