import { Notification, NotificationType } from '../models/notification.model';

type JsonRecord = Record<string, unknown>;

/** Valores del enum `notificationType` del backend. */
const notificationTypesByCode: Record<number, NotificationType> = {
  0: 'STATUS_CHANGE',
  1: 'COMMENT',
};

/** `notificationStatus`: 0 = no leído, 1 = leído. */
const readStatusCode = 1;

/** Contador para dar id propio a los avisos del Hub que llegan sin el de la fila. */
let realtimeSequence = 0;

/**
 * Traduce la respuesta de `GET /notifications/allnotifications` a `Notification[]`.
 */
export function mapNotificationsResponse(response: unknown): Notification[] {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;
  const items = Array.isArray(payload) ? payload : [payload];

  return items.map((item, index) => toNotification(item, index)).filter((notification) => Boolean(notification.id));
}

/**
 * Traduce lo que el Hub envía en `ReceiveNotification`.
 *
 * El backend manda un objeto anónimo `{ message, data, timestamp }`
 * (`Connection360.Infrastructure.dll`). Se prefiere `data`, que debería traer la
 * fila creada; si no viene, se arma la tarjeta con el mensaje y la marca de
 * tiempo, que sí viajan siempre. Devuelve `null` cuando no hay nada que mostrar.
 */
export function mapRealtimeNotification(payload: unknown): Notification {
  // `payload` son los argumentos con que el Hub invocó el método. Se acepta
  // tanto un único objeto envoltorio como varios argumentos sueltos, porque el
  // backend puede mandar `SendAsync(metodo, objeto)` o `SendAsync(metodo, a, b, c)`.
  const args = Array.isArray(payload) ? payload : [payload];
  const objects = args.filter((item): item is JsonRecord => isRecord(item));
  const texts = args.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  // El envoltorio es el objeto que trae `data`; la fila puede venir dentro de
  // él, o el objeto puede ser la fila misma.
  const root = objects.find((item) => getValue(item, ['data', 'dataResponse']) !== undefined) ?? objects[0] ?? {};
  const rawRow = getValue(root, ['data', 'dataResponse']);
  const row = asRecord(Array.isArray(rawRow) ? rawRow[0] : (rawRow ?? root));

  const title = readString(row, ['title', 'titulo']) || readString(root, ['title', 'titulo']);
  const description =
    readString(row, ['message', 'mensaje', 'description']) ||
    readString(root, ['message', 'mensaje', 'description']) ||
    texts[0] ||
    '';
  const timestamp = readString(root, ['timestamp']) || readString(row, ['notificationDate']);

  return {
    // Cada aviso lleva id propio. Los del Hub no se cotejan contra los ya
    // cargados: reutilizar un id del backend haría que la bandeja tomara por
    // repetido todo aviso posterior sobre la misma fila.
    id: `realtime-${++realtimeSequence}`,
    type: toNotificationType(row),
    shipmentDocument: readString(row, ['documentNumber', 'nrDocumento']),
    title: title || 'Notificación nueva',
    // Si nada del payload se reconoce, se muestra crudo en vez de una tarjeta
    // vacía: así se ve qué está mandando el Hub sin abrir la consola.
    description: description || describeUnknownPayload(args),
    createdAt: timestamp || new Date().toISOString(),
    eventDate: readString(row, ['messageDate']) || null,
    read: readNumber(row, ['notificationStatus', 'status'], 0) === readStatusCode,
  };
}

function describeUnknownPayload(args: unknown[]): string {
  try {
    return `Sin texto reconocible en el aviso del Hub: ${JSON.stringify(args.length === 1 ? args[0] : args).slice(0, 300)}`;
  } catch {
    return 'Aviso recibido en tiempo real.';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
