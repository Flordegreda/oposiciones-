/** Reintentos con backoff exponencial + jitter (evita thundering herd). */

export type RetryOptions = {
  /** Intentos adicionales tras el primero (por defecto 3 → 4 en total). */
  retries?: number;
  /** Delay base en ms (por defecto 300). */
  baseDelayMs?: number;
  /** Tope del delay en ms (por defecto 8s). */
  maxDelayMs?: number;
  /** Factor de crecimiento (por defecto 2). */
  factor?: number;
  /** Añade aleatoriedad al delay (por defecto true). */
  jitter?: boolean;
  /** Señal de cancelación opcional. */
  signal?: AbortSignal;
};

const DEFAULTS = {
  retries: 3,
  baseDelayMs: 300,
  maxDelayMs: 8_000,
  factor: 2,
  jitter: true,
} as const;

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
}

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: string; message?: string; status?: number };
  if (e.name === "AbortError") return false;
  if (typeof e.status === "number" && isRetryableHttpStatus(e.status)) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    e.code === "ECONNRESET" ||
    e.code === "ETIMEDOUT" ||
    e.code === "ECONNREFUSED" ||
    e.code === "ENOTFOUND" ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("overloaded") ||
    msg.includes("temporar")
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Delay para el intento `attempt` (0 = primer reintento tras el fallo inicial). */
export function backoffDelayMs(attempt: number, options: RetryOptions = {}): number {
  const base = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const max = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const factor = options.factor ?? DEFAULTS.factor;
  const jitter = options.jitter ?? DEFAULTS.jitter;

  const exp = Math.min(max, base * factor ** attempt);
  if (!jitter) return Math.round(exp);
  // Full jitter: uniforme en [0, exp]
  return Math.round(Math.random() * exp);
}

function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const asInt = Number(raw);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.min(asInt * 1000, 30_000);
  const when = Date.parse(raw);
  if (!Number.isNaN(when)) return Math.min(Math.max(0, when - Date.now()), 30_000);
  return null;
}

/**
 * Ejecuta `fn` y reintenta ante fallos transitorios.
 * `fn` recibe el índice de intento (0 = primero).
 */
export async function withExponentialBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
  shouldRetry: (error: unknown, attempt: number) => boolean = (error) =>
    isRetryableError(error),
): Promise<T> {
  const retries = options.retries ?? DEFAULTS.retries;
  const signal = options.signal;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    signal?.throwIfAborted?.();
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      await sleep(backoffDelayMs(attempt, options), signal);
    }
  }

  throw lastError;
}

/**
 * `fetch` con reintentos ante 503/502/429/504 y errores de red.
 * No reintenta si `init.signal` ya está abortado.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? DEFAULTS.retries;
  const signal = options.signal ?? init?.signal ?? undefined;
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    try {
      const res = await fetch(input, init);
      if (!isRetryableHttpStatus(res.status) || attempt >= retries) {
        return res;
      }
      lastResponse = res;
      const fromHeader = retryAfterMs(res);
      const delay = fromHeader ?? backoffDelayMs(attempt, options);
      await sleep(delay, signal ?? undefined);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) throw error;
      await sleep(backoffDelayMs(attempt, options), signal ?? undefined);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("fetchWithRetry: agotados los reintentos");
}
