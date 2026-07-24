import { fetchWithRetry } from "@/lib/retry";

/** Lee una respuesta fetch como JSON; si el cuerpo no es JSON, devuelve el texto. */
export async function readFetchJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response,
): Promise<{ data: T | null; text: string }> {
  const text = await res.text();
  if (!text) return { data: null, text: "" };
  try {
    return { data: JSON.parse(text) as T, text };
  } catch {
    return { data: null, text };
  }
}

export function fetchErrorMessage(
  res: Response,
  data: Record<string, unknown> | null,
  text: string,
  fallback: string,
): string {
  if (data && typeof data.error === "string") return data.error;
  if (res.status === 503) {
    return "El servicio está temporalmente saturado. Espera unos segundos e inténtalo de nuevo.";
  }
  if (text) {
    if (res.status === 504 || /timeout|timed out/i.test(text)) {
      return "La operación tardó demasiado. Prueba con una sola materia.";
    }
    return text.length > 280 ? `${text.slice(0, 280)}…` : text;
  }
  return fallback;
}

/** fetch + parse JSON con reintentos ante 503/502/429. */
export async function fetchJsonWithRetry<T extends Record<string, unknown> = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ res: Response; data: T | null; text: string }> {
  const res = await fetchWithRetry(input, init, {
    retries: 3,
    baseDelayMs: 400,
    maxDelayMs: 8_000,
  });
  const { data, text } = await readFetchJson<T>(res);
  return { res, data, text };
}
