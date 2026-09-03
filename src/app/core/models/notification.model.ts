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
