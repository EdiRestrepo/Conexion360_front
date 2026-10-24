import { NotificationType } from '../models/notification.model';

const notificationTypeLabels: Record<NotificationType, string> = {
  STATUS_CHANGE: 'Cambio de estado',
  COMMENT: 'Comentario',
  OTHER_INFO: 'Cambio de información',
};

const notificationTypeIcons: Record<NotificationType, string> = {
  STATUS_CHANGE: 'sync_alt',
  COMMENT: 'chat_bubble',
  OTHER_INFO: 'edit_note',
};

export function getNotificationTypeLabel(type: NotificationType): string {
  return notificationTypeLabels[type];
}

export function getNotificationTypeIcon(type: NotificationType): string {
  return notificationTypeIcons[type];
}
