/**
 * Espeja el enum `notificationType` de `GET /notifications/allnotifications`
 * (0 = cambio de estado, 1 = comentario). Si el backend agrega valores, hay que
 * ampliar este tipo y las tablas de `core/utils/notification-labels.ts`.
 */
export type NotificationType = 'STATUS_CHANGE' | 'COMMENT';

export interface Notification {
  id: string;
  type: NotificationType;
  shipmentDocument: string;
  title: string;
  description: string;
  /** `notificationDate`: cuándo se generó la alerta. Ordena la bandeja. */
  createdAt: string;
  /** `messageDate`: cuándo ocurrió el hecho logístico que la originó. */
  eventDate: string | null;
  read: boolean;
}

export interface UserNotificationPreferences {
  email: boolean;
  inApp: boolean;
  sms: boolean;
  shipmentStatusChanges: boolean;
  delivery: boolean;
  delays: boolean;
  shipmentEnRoute: boolean;
  deliveryReminders: boolean;
}

/**
 * Lo que devuelve `GET /settings/viewnotifications`: las preferencias y los dos
 * identificadores de las filas que las guardan.
 *
 * Los ids son lo que distingue un cliente que ya tiene configuración de uno que
 * nunca la guardó, y por eso deciden si al guardar se llama a
 * `createnotifications` o a `updatenotifications`.
 */
export interface NotificationSettings {
  preferences: UserNotificationPreferences;
  /** `notificationChannelId`; 0 cuando el cliente todavía no tiene fila. */
  channelId: number;
  /** `notificationEventId`; 0 cuando el cliente todavía no tiene fila. */
  eventId: number;
}

/**
 * Valores con los que se pinta el formulario mientras llega
 * `GET /settings/viewnotifications`, y con los que se completa un campo que esa
 * respuesta no traiga.
 */
export const defaultNotificationPreferences: UserNotificationPreferences = {
  email: true,
  inApp: true,
  sms: false,
  shipmentStatusChanges: true,
  delivery: true,
  delays: true,
  shipmentEnRoute: false,
  deliveryReminders: false,
};
