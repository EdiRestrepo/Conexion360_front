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
 *
 * La implementación real deberá cubrir, como mínimo:
 * 1. Un endpoint REST de historial equivalente a `getAll()` para la carga inicial.
 * 2. Entrega en tiempo real de notificaciones nuevas (por ejemplo, push desde un
 *    hub tipo SignalR) que alimente el mismo stream que hoy exponen `getUnread()`/
 *    `getUnreadCount()`, más las llamadas REST para persistir en el backend los
 *    cambios de `markAsRead`/`markAllAsRead`.
 */
export const NOTIFICATION_DATA_SOURCE = new InjectionToken<NotificationDataSource>('NOTIFICATION_DATA_SOURCE');
