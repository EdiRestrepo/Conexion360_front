import { InjectionToken } from '@angular/core';
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

/**
 * Origen de datos de notificaciones. Hoy lo resuelve `MockNotificationService`;
 * cuando exista el endpoint real solo se cambia el proveedor en `app.config.ts`.
 */
export const NOTIFICATION_DATA_SOURCE = new InjectionToken<NotificationDataSource>('NOTIFICATION_DATA_SOURCE');
