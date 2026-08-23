import { Notification, NotificationType } from '../models/notification.model';

type JsonRecord = Record<string, unknown>;

/** Valores del enum `notificationType` del backend. */
const notificationTypesByCode: Record<number, NotificationType> = {
  0: 'STATUS_CHANGE',
  1: 'COMMENT',
};

/** `notificationStatus`: 0 = no leído, 1 = leído. */
const readStatusCode = 1;

/**
 * Traduce la respuesta de `GET /notifications/allnotifications` a `Notification[]`.
 */
export function mapNotificationsResponse(response: unknown): Notification[] {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;
  const items = Array.isArray(payload) ? payload : [payload];

  return items.map((item, index) => toNotification(item, index)).filter((notification) => Boolean(notification.id));
}

function toNotification(value: unknown, index: number): Notification {
  const record = asRecord(value);
  const id = readString(record, ['idNotification', 'id']);

  return {
    // El índice solo entra si el backend omitiera el id; sin él, el `track` de
    // la lista y el marcado como leído no tendrían con qué identificar la fila.
    id: id || `notification-${index + 1}`,
    type: toNotificationType(record),
    shipmentDocument: readString(record, ['documentNumber', 'nrDocumento']),
    title: readString(record, ['title', 'titulo']),
    description: readString(record, ['message', 'mensaje', 'description']),
    createdAt: readString(record, ['notificationDate', 'messageDate']),
    eventDate: readString(record, ['messageDate']) || null,
    read: readNumber(record, ['notificationStatus', 'status'], 0) === readStatusCode,
  };
}

function toNotificationType(record: JsonRecord): NotificationType {
  const code = readNumber(record, ['notificationType', 'type'], 0);

  // Un código desconocido cae en "cambio de estado" en vez de romper la lista:
  // el backend puede ampliar el enum antes que el frontend.
  return notificationTypesByCode[code] ?? 'STATUS_CHANGE';
}

function readString(record: JsonRecord, keys: string[]): string {
  const value = getValue(record, keys);

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function readNumber(record: JsonRecord, keys: string[], fallback: number): number {
  const value = getValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getValue(record: JsonRecord, keys: string[]): unknown {
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

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}
