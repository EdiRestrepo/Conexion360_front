/**
 * Formato corto de fecha y hora para la bandeja de notificaciones ("5 ene, 10:30").
 * Compartido entre la lista y el modal de detalle.
 */
export function formatNotificationDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: 'UTC' }).format(date);
  const month = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
  const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(date);

  return `${day} ${month}, ${time}`;
}
