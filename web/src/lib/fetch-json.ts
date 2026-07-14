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
  if (text) {
    if (res.status === 504 || /timeout|timed out/i.test(text)) {
      return "La operación tardó demasiado. Prueba con una sola materia.";
    }
    return text.length > 280 ? `${text.slice(0, 280)}…` : text;
  }
  return fallback;
}
