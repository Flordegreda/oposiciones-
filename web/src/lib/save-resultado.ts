import type { ResultadoDetalleItem, ResultadoTipo } from "@/lib/queries/resultados";

export type SaveResultadoPayload = {
  tipo: ResultadoTipo;
  titulo: string;
  bancoId?: string | null;
  total: number;
  respondidas: number;
  correctas: number;
  incorrectas: number;
  sinResponder: number;
  nota: string;
  porcentaje: number;
  tiempoSegundos?: number | null;
  examMode: boolean;
  detalle: ResultadoDetalleItem[];
};

export async function saveResultadoOnline(
  payload: SaveResultadoPayload,
): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch("/api/progreso/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      resultado?: { id: string };
      reason?: string;
    };
    if (!res.ok || !data.ok) return { ok: false };
    return { ok: true, id: data.resultado?.id };
  } catch {
    return { ok: false };
  }
}
