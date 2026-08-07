import { Observable } from 'rxjs';

import { Notification, NotificationPreference } from '../models/notification.model';

export interface NotificationDataSource {
  getAll(): Observable<Notification[]>;
  getUnread(): Observable<Notification[]>;
  getUnreadCount(): Observable<number>;
  markAsRead(id: string): Observable<Notification | null>;
  markAllAsRead(): Observable<Notification[]>;
  getPreferences(): Observable<NotificationPreference[]>;
}