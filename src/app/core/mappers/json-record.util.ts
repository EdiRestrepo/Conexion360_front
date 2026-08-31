/**
 * Helpers de lectura tolerante para las respuestas del backend.
 *
 * El backend no es consistente en mayúsculas (`dataResponse` / `DataResponse`)
 * ni en el nombre de los campos entre endpoints, así que los mappers prueban
 * varios candidatos en vez de asumir uno solo.
 */
export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function getValue(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const directValue = record[key];

    if (directValue !== undefined) {
      return directValue;
    }

    const matchingKey = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());

    if (matchingKey) {
      return record[matchingKey];
    }
  }

  return undefined;
}

export function readString(record: JsonRecord, keys: string[]): string {
  const value = getValue(record, keys);

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

export function readNumber(record: JsonRecord, keys: string[], fallback: number): number {
  const value = getValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

/** `undefined` cuando el campo no viene, para distinguirlo de un `false` real. */
export function readOptionalBoolean(record: JsonRecord, keys: string[]): boolean | undefined {
  const value = getValue(record, keys);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
}

export function readArray(record: JsonRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = getValue(record, [key]);

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

/** Normaliza a `YYYY-MM-DD`; descarta el `0001-01-01` que devuelve el backend como "sin fecha". */
export function toDateValue(value: string): string | null {
  if (!value || value.startsWith('0001-01-01')) {
    return null;
  }

  return value.split('T')[0] || null;
}
