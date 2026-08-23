import { NotificationType } from '../models/notification.model';

const notificationTypeLabels: Record<NotificationType, string> = {
  STATUS_CHANGE: 'Cambio de estado',
  COMMENT: 'Comentario',
};

const notificationTypeIcons: Record<NotificationType, string> = {
  STATUS_CHANGE: 'sync_alt',
  COMMENT: 'chat_bubble',
};

export function getNotificationTypeLabel(type: NotificationType): string {
  return notificationTypeLabels[type];
}

export function getNotificationTypeIcon(type: NotificationType): string {
  return notificationTypeIcons[type];
}
