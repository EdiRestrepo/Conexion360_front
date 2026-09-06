/**
 * Marca de "última actividad del usuario" en `localStorage`, compartida por
 * todas las pestañas del mismo origen. La usa `IdleSessionService` para decidir
 * cuándo avisar y cuándo cerrar la sesión por inactividad.
 *
 * El almacén es deliberadamente el opuesto al de `browser-session.ts`: allí se
 * usa `sessionStorage` *para que la marca NO se comparta* entre pestañas (cada
 * una debe demostrar su propia sesión de navegador); aquí se usa
 * `localStorage` *para que SÍ se comparta*, porque escribir en una pestaña
 * cuenta como actividad para todas y no tendría sentido cerrarle la sesión a la
 * pestaña de al lado mientras el usuario trabaja.
 *
 * Compartir el valor en `localStorage` también evita mensajería entre pestañas:
 * el ticker de un segundo de `IdleSessionService` ya lee este mismo dato, así
 * que un "Seguir conectado" se propaga solo, en el siguiente tick.
 */
const lastActivityKey = 'c360.last-activity';

/**
 * Respaldo para navegación privada o almacenamiento bloqueado: la sesión pasa a
 * contarse por pestaña en vez de compartida, que es peor experiencia pero nunca
 * un fallo duro.
 */
let memoryFallback: number | null = null;

/**
 * `null` cuando no hay marca o cuando no es utilizable (texto corrupto, valor
 * no finito). Nunca se expulsa al usuario por un dato ilegible: quien llama
 * trata el `null` reescribiendo la marca, no cerrando la sesión.
 */
export function readLastActivity(): number | null {
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(lastActivityKey);
  } catch {
    return memoryFallback;
  }

  if (raw === null) {
    return memoryFallback;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

export function writeLastActivity(timestamp: number): void {
  // Se guarda siempre en memoria: si `localStorage` falla a mitad de la sesión,
  // el servicio conserva una referencia con la que seguir contando.
  memoryFallback = timestamp;

  try {
    localStorage.setItem(lastActivityKey, String(timestamp));
  } catch {
    // Ver `memoryFallback`.
  }
}

export function clearLastActivity(): void {
  memoryFallback = null;

  try {
    localStorage.removeItem(lastActivityKey);
  } catch {
    // Ver `memoryFallback`.
  }
}
