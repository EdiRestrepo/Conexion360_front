import { inputRules } from './input-rules';
import { sanitizeQueryValue } from './input-validators';

/**
 * Búsquedas recientes del buscador del dashboard, guardadas en `sessionStorage`.
 *
 * Mismo almacén que `browser-session.ts` y por la misma razón: sobrevive a un F5
 * y a navegar entre pantallas, pero muere con la pestaña. Además se borra en el
 * `logout()` de `Auth0FacadeService`, así que en un equipo compartido el
 * siguiente usuario no ve las guías que consultó el anterior.
 */
const recentSearchesKey = 'c360.recent-searches';
export const MAX_RECENT_SEARCHES = 5;

/**
 * Lo leído se revalida con la regla del buscador: el almacén es editable desde
 * las herramientas del navegador y estos valores vuelven a pintarse y a
 * enviarse al backend (HU1 – CA02/CA03).
 */
export function readRecentSearches(): string[] {
  let raw: string | null = null;

  try {
    raw = sessionStorage.getItem(recentSearchesKey);
  } catch {
    return [];
  }

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const valid = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => sanitizeQueryValue(item, inputRules.searchQuery))
      .filter((item) => item.length > 0);

    return [...new Set(valid)].slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearches(searches: string[]): void {
  try {
    if (searches.length === 0) {
      sessionStorage.removeItem(recentSearchesKey);
    } else {
      sessionStorage.setItem(recentSearchesKey, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
    }
  } catch {
    // Sin almacenamiento las búsquedas viven solo en memoria: se pierden al
    // recargar, pero el buscador sigue funcionando.
  }
}

export function clearRecentSearches(): void {
  saveRecentSearches([]);
}
