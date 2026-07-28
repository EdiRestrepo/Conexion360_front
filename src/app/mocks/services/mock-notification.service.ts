import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay, map, of, throwError } from 'rxjs';

import { Notification, NotificationPreference, NotificationType } from '../../core/models/notification.model';
import { Shipment } from '../../core/models/shipment.model';
import { NotificationDataSource } from '../../core/services/notification-data-source';
import { getShipmentStatusLabel } from '../../core/utils/display-labels';
import { mockShipments } from '../data/mock-shipments';

export type MockNotificationResponseMode = 'success' | 'empty' | 'error';

export interface MockNotificationSimulationConfig {
  latencyMs?: number;
  responseMode?: MockNotificationResponseMode;
}

const defaultLatencyMs = 250;
const notificationTypes: NotificationType[] = ['DELAY', 'STATUS_CHANGE', 'IN_TRANSIT', 'CUSTOMS', 'DELIVERY', 'DOCUMENT', 'CONTAINER_EXPIRING'];

@Injectable({
  providedIn: 'root',
})
export class MockNotificationService implements NotificationDataSource {
  private readonly notifications$ = new BehaviorSubject<Notification[]>(createMockNotifications(mockShipments));
  private readonly preferences$ = new BehaviorSubject<NotificationPreference[]>(
    notificationTypes.map((type) => ({ type, enabled: true })),
  );
  private simulationConfig: Required<MockNotificationSimulationConfig> = {
    latencyMs: defaultLatencyMs,
    responseMode: 'success',
  };

  configureSimulation(config: MockNotificationSimulationConfig): void {
    this.simulationConfig = { ...this.simulationConfig, ...config };
  }

  resetSimulation(): void {
    this.simulationConfig = { latencyMs: defaultLatencyMs, responseMode: 'success' };
    this.notifications$.next(createMockNotifications(mockShipments));
  }

  getAll(): Observable<Notification[]> {
    return this.respondWith(this.notifications$.value);
  }

  getUnread(): Observable<Notification[]> {
    return this.getAll().pipe(map((notifications) => notifications.filter((notification) => !notification.read)));
  }

  getUnreadCount(): Observable<number> {
    return this.notifications$.pipe(map((notifications) => notifications.filter((notification) => !notification.read).length));
  }

  markAsRead(id: string): Observable<Notification | null> {
    const notifications = this.notifications$.value;
    const target = notifications.find((notification) => notification.id === id) ?? null;

    if (!target) {
      return this.respondWith(null);
    }

    const updated = { ...target, read: true };
    this.notifications$.next(notifications.map((notification) => (notification.id === id ? updated : notification)));
    return this.respondWith(updated);
  }

  markAllAsRead(): Observable<Notification[]> {
    const updated = this.notifications$.value.map((notification) => ({ ...notification, read: true }));
    this.notifications$.next(updated);
    return this.respondWith(updated);
  }

  getPreferences(): Observable<NotificationPreference[]> {
    return this.respondWith(this.preferences$.value);
  }

  private respondWith<T>(value: T): Observable<T> {
    if (this.simulationConfig.responseMode === 'error') {
      return throwError(() => new Error('Error simulado al consultar notificaciones')).pipe(delay(this.simulationConfig.latencyMs));
    }

    if (this.simulationConfig.responseMode === 'empty') {
      return of(this.emptyValue(value)).pipe(delay(this.simulationConfig.latencyMs));
    }

    return of(value).pipe(delay(this.simulationConfig.latencyMs));
  }

  private emptyValue<T>(value: T): T {
    if (Array.isArray(value)) {
      return [] as T;
    }

    return null as T;
  }
}

function createMockNotifications(shipments: Shipment[]): Notification[] {
  return shipments.slice(0, 14).map((shipment, index) => createNotification(shipment, index + 1));
}

function createNotification(shipment: Shipment, sequence: number): Notification {
  const type = getNotificationType(shipment);
  const location = getNotificationLocation(shipment);
  const createdAt = getNotificationDate(shipment, sequence);

  return {
    id: `notification-${sequence.toString().padStart(3, '0')}`,
    type,
    shipmentId: shipment.id,
    shipmentDocument: shipment.documentNumber,
    title: getNotificationTitle(type),
    description: getNotificationDescription(type, shipment),
    createdAt,
    location,
    read: sequence % 3 === 0,
    status: shipment.status,
  };
}

function getNotificationType(shipment: Shipment): NotificationType {
  if (shipment.container && shipment.container.remainingDays !== null && shipment.container.remainingDays <= 2) {
    return 'CONTAINER_EXPIRING';
  }

  if (shipment.issue?.type === 'DELAY') {
    return 'DELAY';
  }

  if (shipment.issue?.type === 'DOCUMENT_PENDING') {
    return 'DOCUMENT';
  }

  if (shipment.status === 'DELIVERED') {
    return 'DELIVERY';
  }

  if (shipment.status === 'IN_TRANSIT') {
    return 'IN_TRANSIT';
  }

  if (shipment.status === 'ORIGIN_CUSTOMS' || shipment.status === 'DESTINATION_CUSTOMS') {
    return 'CUSTOMS';
  }

  return 'STATUS_CHANGE';
}

function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    DELAY: 'Demora registrada',
    STATUS_CHANGE: 'Cambio de estado',
    IN_TRANSIT: 'Envío en tránsito',
    CUSTOMS: 'Gestión aduanera',
    DELIVERY: 'Entrega completada',
    DOCUMENT: 'Documento pendiente',
    CONTAINER_EXPIRING: 'Contenedor próximo a vencer',
  };

  return titles[type];
}

function getNotificationDescription(type: NotificationType, shipment: Shipment): string {
  const statusLabel = getShipmentStatusLabel(shipment.status).toLowerCase();
  const descriptions: Record<NotificationType, string> = {
    DELAY: shipment.issue?.comment ?? 'Se registró una demora logística en la operación.',
    STATUS_CHANGE: `El envío cambió a estado ${statusLabel}.`,
    IN_TRANSIT: 'La operación continúa su tránsito internacional.',
    CUSTOMS: 'El envío requiere seguimiento en proceso aduanero.',
    DELIVERY: 'El envío registra entrega final en los datos simulados.',
    DOCUMENT: shipment.issue?.comment ?? 'Hay documentos pendientes de validación.',
    CONTAINER_EXPIRING: 'Los días libres del contenedor están próximos a vencer.',
  };

  return descriptions[type];
}

function getNotificationLocation(shipment: Shipment): string | null {
  const location = shipment.status === 'DELIVERED' || shipment.status === 'DESTINATION_CUSTOMS' ? shipment.destination : shipment.origin;
  return [location.city, location.country].filter((value): value is string => Boolean(value)).join(', ') || null;
}

function getNotificationDate(shipment: Shipment, sequence: number): string {
  const date = shipment.events.at(-1)?.dateTime ?? `${shipment.logisticDates.etd ?? '2026-01-01'}T08:30:00.000Z`;
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return `2026-01-${sequence.toString().padStart(2, '0')}T08:30:00.000Z`;
  }

  parsed.setUTCHours(8 + (sequence % 9), sequence % 2 === 0 ? 15 : 45, 0, 0);
  return parsed.toISOString();
}