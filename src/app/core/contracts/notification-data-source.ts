import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Notification } from '../models/notification.model';

export interface NotificationDataSource {
  getAll(): Observable<Notification[]>;
  getUnreadCount(): Observable<number>;
  markAsRead(id: string): Observable<Notification | null>;
  /** Invalida la copia local para que la próxima consulta vaya al backend. */
  reload(): void;
}

/**
 * Origen de datos de notificaciones. Lo resuelve `ApiNotificationsService`
 * contra `GET /notifications/allnotifications`.
 *
 * Pendiente en el backend:
 * 1. Endpoint para persistir `markAsRead` (hoy el cambio vive solo en memoria).
 * 2. Entrega en tiempo real (push tipo SignalR) que alimente el mismo stream
 *    que ya exponen `getAll()` y `getUnreadCount()`.
 */
export const NOTIFICATION_DATA_SOURCE = new InjectionToken<NotificationDataSource>('NOTIFICATION_DATA_SOURCE');
