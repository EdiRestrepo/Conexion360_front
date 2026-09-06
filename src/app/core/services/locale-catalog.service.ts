import { Injectable } from '@angular/core';

/**
 * Opción de un desplegable con el código separado de la etiqueta.
 *
 * La distinción es el punto de todo el servicio: el código es dato —lo que
 * debería viajar al backend y quedar guardado—, mientras que la etiqueta es
 * presentación y se recalcula en cada arranque. Hoy `viewmaster` devuelve
 * etiquetas («USD - Dólar», «America/Bogota(UTC-5)»), y de ahí vienen los
 * desajustes que `match()` tiene que reparar.
 */
export interface CatalogOption {
  /** `America/Bogota`, `USD`, `es`. */
  value: string;
  /** `America/Bogota (UTC-5)`, `USD - Dólar estadounidense`, `Español`. */
  label: string;
}

/** Idioma en el que se muestran los nombres de monedas e idiomas. */
const displayLocale = 'es';

/**
 * Los idiomas no salen de `Intl` —no hay un `supportedValuesOf('language')`— ni
 * conviene que salieran: listar los cientos que sabe nombrar prometería
 * traducciones inexistentes. Van los mercados de la operación, y se amplía
 * añadiendo el código aquí; el nombre lo pone `Intl.DisplayNames`.
 *
 * Ojo: hoy solo la interfaz en español está traducida. El desplegable es de
 * solo lectura mientras no exista endpoint de guardado, así que no promete nada
 * todavía; cuando se pueda guardar, habrá que traducir de verdad o marcar los
 * idiomas pendientes.
 */
const supportedLanguages = ['es', 'en', 'pt'];

/**
 * Respaldo para motores sin `Intl.supportedValuesOf` (Safari < 15.4 y algunos
 * entornos de prueba). No aspira a ser completo: son los mercados donde opera
 * la plataforma, lo justo para que la pantalla siga siendo usable.
 */
const fallbackTimeZones = [
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/Santiago',
  'America/Sao_Paulo',
  'Europe/Madrid',
  'UTC',
];

const fallbackCurrencies = ['BRL', 'CLP', 'COP', 'EUR', 'MXN', 'PEN', 'USD'];

/**
 * Catálogos de zona horaria, moneda e idioma para los desplegables de ajustes.
 *
 * Ninguna API externa: el navegador ya trae la lista IANA de zonas y la ISO
 * 4217 de monedas, con sus nombres traducidos, vía `Intl`. Eso evita una clave,
 * una dependencia de red en el arranque de la pantalla y un proveedor que
 * mañana cambie el contrato; y a cambio los datos son los del ICU del propio
 * navegador, que se actualiza con él.
 *
 * Los desfases horarios se calculan al vuelo y no se escriben en ningún sitio:
 * `Europe/Madrid` es UTC+1 o UTC+2 según la época del año, así que cualquier
 * lista con el desfase incrustado —como la fija que había antes— acierta solo
 * medio año.
 */
@Injectable({
  providedIn: 'root',
})
export class LocaleCatalogService {
  // Construir las zonas cuesta ~90 ms (una `DateTimeFormat` por zona para leer
  // su desfase), así que se hace una sola vez por sesión y bajo demanda.
  private timeZoneCache: CatalogOption[] | null = null;
  private currencyCache: CatalogOption[] | null = null;
  private languageCache: CatalogOption[] | null = null;

  timeZones(): CatalogOption[] {
    this.timeZoneCache ??= supportedValues('timeZone', fallbackTimeZones)
      .map((zone) => ({ value: zone, label: `${zone.replace(/_/g, ' ')} (${getOffsetLabel(zone)})` }))
      .sort((a, b) => a.value.localeCompare(b.value));

    return this.timeZoneCache;
  }

  currencies(): CatalogOption[] {
    const names = createDisplayNames('currency');

    this.currencyCache ??= supportedValues('currency', fallbackCurrencies)
      .map((code) => ({ value: code, label: `${code} - ${capitalize(safeDisplayName(names, code))}` }))
      .sort((a, b) => a.value.localeCompare(b.value));

    return this.currencyCache;
  }

  languages(): CatalogOption[] {
    const names = createDisplayNames('language');

    this.languageCache ??= supportedLanguages.map((code) => ({
      value: code,
      label: capitalize(safeDisplayName(names, code)),
    }));

    return this.languageCache;
  }

  /**
   * Filtra por cualquier parte del texto, no solo por el principio: quien
   * escribe «bogo» espera encontrar `America/Bogota`, y quien escribe «utc-5»
   * espera las zonas de ese huso.
   */
  filter(options: CatalogOption[], query: string): CatalogOption[] {
    const needle = normalize(query ?? '');

    if (!needle) {
      return options;
    }

    return options.filter(
      (option) => normalize(option.label).includes(needle) || normalize(option.value).includes(needle),
    );
  }

  /**
   * Busca en el catálogo el valor que guardó el backend.
   *
   * Es la pieza que aguanta el contrato actual: hoy llega una etiqueta y hay
   * que deducir el código («USD - Dólar» → `USD`, «America/Bogota(UTC-5)» →
   * `America/Bogota`). El día que `viewmaster` guarde códigos, el primer
   * `find` acierta a la primera y el resto de la función deja de usarse sola,
   * sin tocar la pantalla.
   *
   * Devuelve `null` en vez de adivinar: un valor irreconocible no puede
   * mostrarse como si fuera otro.
   */
  match(options: CatalogOption[], rawValue: string): CatalogOption | null {
    const raw = rawValue?.trim();

    if (!raw) {
      return null;
    }

    const code = extractCode(raw);
    const normalizedRaw = normalize(raw);
    const normalizedCode = normalize(code);

    return (
      options.find((option) => option.value === raw) ??
      options.find((option) => option.value === code) ??
      options.find((option) => normalize(option.value) === normalizedCode) ??
      options.find((option) => normalize(option.label) === normalizedRaw) ??
      null
    );
  }
}

/**
 * `Intl.supportedValuesOf` es de ES2022: existe en todo lo que soporta Angular
 * 20, pero no en motores antiguos ni en algunos entornos de prueba, y ahí es
 * preferible una lista corta a una pantalla sin opciones.
 */
function supportedValues(key: 'timeZone' | 'currency', fallback: string[]): string[] {
  if (typeof Intl.supportedValuesOf !== 'function') {
    return [...fallback];
  }

  try {
    return [...Intl.supportedValuesOf(key)];
  } catch {
    return [...fallback];
  }
}

/**
 * `shortOffset` devuelve `GMT-5`; se reescribe a `UTC-5` porque es como lo
 * nombra el resto de la aplicación (y como lo guarda hoy el backend).
 */
function getOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';

    return offset.replace('GMT', 'UTC');
  } catch {
    return 'UTC';
  }
}

function createDisplayNames(type: 'currency' | 'language'): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([displayLocale], { type });
  } catch {
    return null;
  }
}

/** `of()` lanza si el código no es válido para el tipo; el propio código sirve de etiqueta. */
function safeDisplayName(names: Intl.DisplayNames | null, code: string): string {
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Las etiquetas de `Intl` vienen en minúscula («dólar estadounidense»). */
function capitalize(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase(displayLocale) + value.slice(1) : value;
}

/** `USD - Dólar` → `USD`; `America/Bogota(UTC-5)` → `America/Bogota`. */
function extractCode(rawValue: string): string {
  return rawValue.split('(')[0].split(' - ')[0].trim();
}

/**
 * Compara ignorando mayúsculas, acentos y separadores. Los acentos no se
 * transliteran: al quedar fuera de `a-z0-9` desaparecen en los dos lados de la
 * comparación, así que `Español` y `español` acaban igual.
 */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
