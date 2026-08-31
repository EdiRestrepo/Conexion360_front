const emptyValue = '—';

/** `dd/mm/aaaa`, o `—` si la fecha falta o es el `0001-01-01` del backend. */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return emptyValue;
  }

  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** `dd/mm/aaaa, hh:mm`, para momentos donde la hora importa (último acceso). */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return emptyValue;
  }

  return `${formatDate(value)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value || value.startsWith('0001-01-01')) {
    return null;
  }

  const date = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
