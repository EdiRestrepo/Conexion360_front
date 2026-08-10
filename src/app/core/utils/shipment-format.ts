import { Location } from '../models/shipment.model';

export function getLocationLabel(location: Location): string {
  return [location.city, location.country].filter((value): value is string => Boolean(value)).join(', ');
}

export function formatShipmentDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
