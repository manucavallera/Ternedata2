// Las llamadas a Claude, Groq y Evolution no tenían límite de tiempo: si una se colgaba, el
// productor no recibía respuesta y el mensaje, ya marcado como visto, no se reprocesaba.
export const TIMEOUT_MS = 20000;

export const fetchConTimeout = (
  url: string,
  init: RequestInit = {},
  ms: number = TIMEOUT_MS,
): Promise<Response> => fetch(url, { ...init, signal: AbortSignal.timeout(ms) });

// Un AbortSignal.timeout vencido lanza TimeoutError (o AbortError según el runtime).
export const esTimeout = (err: any): boolean =>
  err?.name === 'TimeoutError' || err?.name === 'AbortError';
