import { revalidateContentCache } from "@/lib/revalidate-content";
import { getSupabase } from "@/lib/supabase/server";
import { isEncadenadoBankName } from "@/lib/encadenado-utils";
import { supuestosSchemaReady } from "@/lib/queries/schema";

export type RepairEncadenadoResult = {
  bancoId: string;
  nombre: string;
  status: "ok" | "skipped" | "error";
  message: string;
  supuestoId?: string;
  preguntasVinculadas?: number;
};

/** Crea supuesto y vincula preguntas en bancos *ENCADENADO* sin supuesto_id. */
export async function repairEncadenadoBancos(opts?: {
  nombres?: string[];
  texto?: string;
}): Promise<RepairEncadenadoResult[]> {
  if (!(await supuestosSchemaReady())) {
    throw new Error("Falta la tabla supuestos. Actívala en Material.");
  }

  const supabase = getSupabase();
  const { data: bancos, error: bErr } = await supabase
    .from("bancos")
    .select("id, nombre")
    .order("nombre");

  if (bErr) throw bErr;

  const targets = (bancos ?? []).filter((b) => {
    if (opts?.nombres?.length) {
      return opts.nombres.some(
        (n) => n.trim().toLowerCase() === b.nombre.trim().toLowerCase(),
      );
    }
    return isEncadenadoBankName(b.nombre);
  });

  const results: RepairEncadenadoResult[] = [];

  for (const banco of targets) {
    const { data: supuestos } = await supabase
      .from("supuestos")
      .select("id, texto")
      .eq("banco_id", banco.id)
      .order("orden");

    const { data: preguntas, error: pErr } = await supabase
      .from("preguntas")
      .select("id, supuesto_id")
      .eq("banco_id", banco.id)
      .order("orden");

    if (pErr) {
      results.push({
        bancoId: banco.id,
        nombre: banco.nombre,
        status: "error",
        message: pErr.message,
      });
      continue;
    }

    const sinVincular = (preguntas ?? []).filter((p) => !p.supuesto_id);
    if (!sinVincular.length) {
      results.push({
        bancoId: banco.id,
        nombre: banco.nombre,
        status: "skipped",
        message: "Todas las preguntas ya tienen supuesto",
      });
      continue;
    }

    let supuestoId = supuestos?.[0]?.id;
    if (!supuestoId) {
      const texto =
        opts?.texto?.trim() ||
        "Enunciado del supuesto (edítalo en Administración → Editar banco).";
      const { data: nuevo, error: sErr } = await supabase
        .from("supuestos")
        .insert({
          banco_id: banco.id,
          titulo: banco.nombre,
          texto,
          orden: 0,
        })
        .select("id")
        .single();

      if (sErr || !nuevo) {
        results.push({
          bancoId: banco.id,
          nombre: banco.nombre,
          status: "error",
          message: sErr?.message ?? "No se pudo crear el supuesto",
        });
        continue;
      }
      supuestoId = nuevo.id;
    }

    const { error: uErr } = await supabase
      .from("preguntas")
      .update({ supuesto_id: supuestoId })
      .eq("banco_id", banco.id)
      .is("supuesto_id", null);

    if (uErr) {
      results.push({
        bancoId: banco.id,
        nombre: banco.nombre,
        status: "error",
        message: uErr.message,
      });
      continue;
    }

    results.push({
      bancoId: banco.id,
      nombre: banco.nombre,
      status: "ok",
      message: `Vinculadas ${sinVincular.length} pregunta(s) al supuesto`,
      supuestoId,
      preguntasVinculadas: sinVincular.length,
    });
  }

  revalidateContentCache();
  return results;
}
