/** Identificador anónimo del navegador para colas de repaso (localStorage). Sin login. */
const KEY = "jex_dispositivo_id";

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getDispositivoId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(KEY)?.trim();
    if (existing) return existing;
    const id = createDeviceId();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return createDeviceId();
  }
}
