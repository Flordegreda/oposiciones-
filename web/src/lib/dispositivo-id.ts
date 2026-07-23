/** Código de sincronización del repaso (localStorage). Sin login. */
const KEY = "jex_dispositivo_id";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I/O/0/1

function randomChunk(len: number): string {
  let out = "";
  const arr =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(len))
      : null;
  for (let i = 0; i < len; i++) {
    const n = arr ? arr[i]! : Math.floor(Math.random() * 256);
    out += ALPHABET[n % ALPHABET.length]!;
  }
  return out;
}

/** Código legible: JEX-XXXX-XXXX */
export function createSyncCode(): string {
  return `JEX-${randomChunk(4)}-${randomChunk(4)}`;
}

/** Normaliza lo que pega el usuario (acepta UUID antiguo o JEX-…). */
export function normalizeSyncCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return null;

  // Formato nuevo
  const jex = cleaned.replace(/[^A-Z0-9-]/g, "");
  const m = jex.match(/^JEX-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/);
  if (m) {
    const body = jex.replace(/^JEX-?/, "").replace(/-/g, "");
    if (body.length !== 8) return null;
    return `JEX-${body.slice(0, 4)}-${body.slice(4)}`;
  }

  // UUID u otros ids ya guardados
  const legacy = raw.trim();
  if (legacy.length >= 8 && legacy.length <= 80 && /^[\w.-]+$/.test(legacy)) {
    return legacy;
  }
  return null;
}

export function formatSyncCodeForDisplay(id: string): string {
  const n = normalizeSyncCode(id);
  return n ?? id;
}

export function getDispositivoId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(KEY)?.trim();
    if (existing) {
      const normalized = normalizeSyncCode(existing);
      if (normalized && normalized !== existing) {
        window.localStorage.setItem(KEY, normalized);
        return normalized;
      }
      return existing;
    }
    const id = createSyncCode();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return createSyncCode();
  }
}

/** Usa el código de otro dispositivo (misma cola de falladas). */
export function setDispositivoId(raw: string): string {
  const id = normalizeSyncCode(raw);
  if (!id) throw new Error("Código no válido. Ejemplo: JEX-AB12-CD34");
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* ignore quota */
    }
  }
  return id;
}
