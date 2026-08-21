import { NextRequest, NextResponse } from "next/server";
import { revalidateAfterFichasChange } from "@/lib/revalidate-content";
import { parseFichasText, type ParsedFicha } from "@/lib/parse-fichas-text";
import {
  baseMazoNombre,
  mazoNombreParte,
  splitIntoChunks,
  splitForAppend,
} from "@/lib/split-fichas-mazo";
import { fichasSchemaReady } from "@/lib/queries/schema";
import { getSupabase } from "@/lib/supabase/server";

async function insertFichas(
  supabase: ReturnType<typeof getSupabase>,
  mazoId: string,
  fichas: ParsedFicha[],
  ordenBase: number,
) {
  if (!fichas.length) return;

  const rows = fichas.map((f, i) => ({
    mazo_id: mazoId,
    frente: f.frente,
    dorso: f.dorso,
    orden: ordenBase + i,
  }));

  const { error } = await supabase.from("fichas").insert(rows);
  if (error) throw new Error(error.message);
}

async function createMazo(
  supabase: ReturnType<typeof getSupabase>,
  materiaId: string,
  nombre: string,
) {
  const { data: created, error } = await supabase
    .from("mazos_fichas")
    .insert({ materia_id: materiaId, nombre, active: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

export async function GET() {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json({ error: "Activa fichas primero" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mazos_fichas")
    .select("id, nombre, materia_id, active, materias(nombre)")
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await fichasSchemaReady())) {
    return NextResponse.json(
      { error: "Activa fichas con la tarjeta amarilla de Material" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const materiaId = String(body.materiaId ?? "").trim();
  const nombre = String(body.nombre ?? "").trim();
  const texto = String(body.texto ?? "");
  const replace = Boolean(body.replace);

  if (!materiaId) {
    return NextResponse.json({ error: "Falta materiaId" }, { status: 400 });
  }
  if (!nombre) {
    return NextResponse.json({ error: "Nombre del mazo requerido" }, { status: 400 });
  }

  const parsed = parseFichasText(texto);
  if (!parsed.length) {
    return NextResponse.json(
      {
        error:
          "No se detectaron fichas. Usa P:/R:, Q:/A:, «Respuesta:», o frente :: dorso.",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data: materia, error: mErr } = await supabase
    .from("materias")
    .select("id")
    .eq("id", materiaId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!materia) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  let mazoId = String(body.mazoId ?? "").trim();
  const baseNombre = baseMazoNombre(nombre);
  const mazoIds: string[] = [];
  const chunkSizes: number[] = [];

  try {
    if (mazoId) {
      const { data: existing, error: eErr } = await supabase
        .from("mazos_fichas")
        .select("id")
        .eq("id", mazoId)
        .maybeSingle();
      if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
      if (!existing) return NextResponse.json({ error: "Mazo no encontrado" }, { status: 404 });

      if (replace) {
        const { error: delErr } = await supabase.from("fichas").delete().eq("mazo_id", mazoId);
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

        const chunks = splitIntoChunks(parsed);
        const total = chunks.length;

        const { error: updErr } = await supabase
          .from("mazos_fichas")
          .update({
            nombre: mazoNombreParte(baseNombre, 1, total),
            materia_id: materiaId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mazoId);
        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

        for (let i = 0; i < chunks.length; i++) {
          let targetId = mazoId;
          if (i > 0) {
            targetId = await createMazo(
              supabase,
              materiaId,
              mazoNombreParte(baseNombre, i + 1, total),
            );
          }
          await insertFichas(supabase, targetId, chunks[i], 0);
          mazoIds.push(targetId);
          chunkSizes.push(chunks[i].length);
        }
      } else {
        const { data: maxRow } = await supabase
          .from("fichas")
          .select("orden")
          .eq("mazo_id", mazoId)
          .order("orden", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: existingCount, error: countErr } = await supabase
          .from("fichas")
          .select("id", { count: "exact", head: true })
          .eq("mazo_id", mazoId);
        if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

        const current = existingCount ?? 0;
        const { appendToExisting, newMazos } = splitForAppend(current, parsed);
        let ordenBase = (maxRow?.orden as number | undefined) ?? 0;
        if (maxRow) ordenBase += 1;

        if (appendToExisting.length) {
          await insertFichas(supabase, mazoId, appendToExisting, ordenBase);
          if (!newMazos.length) {
            chunkSizes.push(appendToExisting.length);
          }
        }
        mazoIds.push(mazoId);

        if (newMazos.length) {
          const totalParts = 1 + newMazos.length;
          if (appendToExisting.length && !baseMazoNombre(nombre).includes("(")) {
            const { error: renameErr } = await supabase
              .from("mazos_fichas")
              .update({
                nombre: mazoNombreParte(baseNombre, 1, totalParts),
                updated_at: new Date().toISOString(),
              })
              .eq("id", mazoId);
            if (renameErr) return NextResponse.json({ error: renameErr.message }, { status: 500 });
          }

          for (let i = 0; i < newMazos.length; i++) {
            const partName =
              newMazos.length === 1 && !appendToExisting.length
                ? `${baseNombre} (continuación)`
                : mazoNombreParte(baseNombre, i + 2, totalParts);
            const newId = await createMazo(supabase, materiaId, partName);
            await insertFichas(supabase, newId, newMazos[i], 0);
            mazoIds.push(newId);
            chunkSizes.push(newMazos[i].length);
          }
        } else if (!appendToExisting.length) {
          await insertFichas(supabase, mazoId, parsed, ordenBase);
          chunkSizes.push(parsed.length);
        }
      }
    } else {
      const chunks = splitIntoChunks(parsed);
      const total = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const partName = mazoNombreParte(baseNombre, i + 1, total);
        const newId = await createMazo(supabase, materiaId, partName);
        await insertFichas(supabase, newId, chunks[i], 0);
        mazoIds.push(newId);
        chunkSizes.push(chunks[i].length);
      }
      mazoId = mazoIds[0] ?? "";
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al importar";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  for (const id of mazoIds) {
    revalidateAfterFichasChange(id);
  }

  const imported = parsed.length;
  const numMazos = mazoIds.length;
  const sizesText = chunkSizes.join(" + ");

  let message: string;
  if (numMazos > 1) {
    message = `Importadas ${imported} fichas en ${numMazos} mazos (${sizesText}): «${mazoNombreParte(baseNombre, 1, numMazos)}»…`;
  } else {
    message = `Mazo «${baseNombre}»: ${imported} ficha${imported !== 1 ? "s" : ""} importada${imported !== 1 ? "s" : ""}.`;
  }

  return NextResponse.json({
    mazoId,
    mazoIds,
    imported,
    mazosCreated: numMazos,
    message,
  });
}
