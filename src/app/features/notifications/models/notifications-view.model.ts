import type { Notification } from '../../../core/models/notification.model';
export type NotificationFilter = 'all' | 'unread';
export interface NotificationsViewModel { state: 'loading' | 'empty' | 'error' | 'success'; notifications: Notification[]; filter: NotificationFilter; message?: string; }
