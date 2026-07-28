import { NotificationType } from '../models/notification.model';

export type NotificationTone = 'info' | 'warning' | 'success';

const notificationTypeLabels: Record<NotificationType, string> = {
  DELAY: 'Demora',
  STATUS_CHANGE: 'Cambio de estado',
  IN_TRANSIT: 'En tránsito',
  CUSTOMS: 'Aduana',
  DELIVERY: 'Entrega',
  DOCUMENT: 'Documento',
  CONTAINER_EXPIRING: 'Contenedor próximo a vencer',
};

const notificationTypeIcons: Record<NotificationType, string> = {
  DELAY: 'warning',
  STATUS_CHANGE: 'sync_alt',
  IN_TRANSIT: 'local_shipping',
  CUSTOMS: 'gavel',
  DELIVERY: 'task_alt',
  DOCUMENT: 'description',
  CONTAINER_EXPIRING: 'event_busy',
};

const notificationTypeTones: Record<NotificationType, NotificationTone> = {
  DELAY: 'warning',
  STATUS_CHANGE: 'info',
  IN_TRANSIT: 'info',
  CUSTOMS: 'warning',
  DELIVERY: 'success',
  DOCUMENT: 'info',
  CONTAINER_EXPIRING: 'warning',
};

export function getNotificationTypeLabel(type: NotificationType): string {
  return notificationTypeLabels[type];
}

export function getNotificationTypeIcon(type: NotificationType): string {
  return notificationTypeIcons[type];
}

export function getNotificationTone(type: NotificationType): NotificationTone {
  return notificationTypeTones[type];
}