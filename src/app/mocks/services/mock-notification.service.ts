import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, delay, map, of, throwError } from 'rxjs';

import { Notification, NotificationPreference, NotificationType } from '../../core/models/notification.model';
import { Shipment, ShipmentIssueType, TransportMode } from '../../core/models/shipment.model';
import { NotificationDataSource } from '../../core/contracts/notification-data-source';
import { getShipmentStatusLabel } from '../../core/utils/display-labels';
import { mockShipments } from '../data/mock-shipments';

export type MockNotificationResponseMode = 'success' | 'empty' | 'error';

export interface MockNotificationSimulationConfig {
  latencyMs?: number;
  responseMode?: MockNotificationResponseMode;
}

const defaultLatencyMs = 250;
const notificationSampleSize = 14;
const notificationTypes: NotificationType[] = ['DELAY', 'STATUS_CHANGE', 'IN_TRANSIT', 'CUSTOMS', 'DELIVERY', 'DOCUMENT', 'CONTAINER_EXPIRING'];

// Cadencia demo-friendly: suficientemente espaciada para no saturar la UI en una
// demo/QA en vivo, pero corta para ver varias llegadas en pocos minutos. Simula, sin
// backend real, el mismo camino reactivo que después alimentará un push de SignalR.
const liveArrivalIntervalMs = 45_000;

@Injectable({
  providedIn: 'root',
})
export class MockNotificationService implements NotificationDataSource, OnDestroy {
  private readonly notifications$ = new BehaviorSubject<Notification[]>(createMockNotifications(mockShipments));
  private readonly preferences$ = new BehaviorSubject<NotificationPreference[]>(
    notificationTypes.map((type) => ({ type, enabled: true })),
  );
  private simulationConfig: Required<MockNotificationSimulationConfig> = {
    latencyMs: defaultLatencyMs,
    responseMode: 'success',
  };
  private liveTimer: ReturnType<typeof setInterval> | null = null;
  private liveShipmentCursor = 0;

  constructor() {
    this.armLiveSimulation();
  }

  ngOnDestroy(): void {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
  }

  configureSimulation(config: MockNotificationSimulationConfig): void {
    this.simulationConfig = { ...this.simulationConfig, ...config };
  }

  resetSimulation(): void {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
    }

    this.simulationConfig = { latencyMs: defaultLatencyMs, responseMode: 'success' };
    this.notifications$.next(createMockNotifications(mockShipments));
    this.liveShipmentCursor = 0;
    this.armLiveSimulation();
  }

  /** Empuja una notificación nueva al stream, como lo haría un push real. Público para el intervalo interno y para pruebas deterministas. */
  simulateLiveArrival(): void {
    const shipment = mockShipments[this.liveShipmentCursor % mockShipments.length];
    this.liveShipmentCursor++;

    const current = this.notifications$.value;
    const notification: Notification = {
      ...createNotification(shipment, current.length + 1),
      createdAt: new Date().toISOString(),
      read: false,
    };

    this.notifications$.next([notification, ...current]);
  }

  getAll(): Observable<Notification[]> {
    if (this.simulationConfig.responseMode === 'error') {
      return throwError(() => new Error('Error simulado al consultar notificaciones')).pipe(delay(this.simulationConfig.latencyMs));
    }

    return this.notifications$.pipe(
      map((notifications) => (this.simulationConfig.responseMode === 'empty' ? [] : notifications)),
      delay(this.simulationConfig.latencyMs),
    );
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

  private armLiveSimulation(): void {
    this.liveTimer = setInterval(() => this.simulateLiveArrival(), liveArrivalIntervalMs);
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
  return selectNotificationShipments(shipments).map((shipment, index) => createNotification(shipment, index + 1));
}

/**
 * Toma primero una muestra por cada variante de alerta para que el listado
 * cubra todos los tipos del backlog y luego completa hasta el tamaño de página.
 */
function selectNotificationShipments(shipments: Shipment[]): Shipment[] {
  const selected = new Map<string, Shipment>();
  const variants = new Set<string>();

  for (const shipment of shipments) {
    const variant = `${getNotificationType(shipment)}-${isContainerShipment(shipment)}`;

    if (!variants.has(variant)) {
      variants.add(variant);
      selected.set(shipment.id, shipment);
    }
  }

  for (const shipment of shipments) {
    if (selected.size >= notificationSampleSize) {
      break;
    }

    selected.set(shipment.id, shipment);
  }

  return [...selected.values()].slice(0, notificationSampleSize);
}

function createNotification(shipment: Shipment, sequence: number): Notification {
  const type = getNotificationType(shipment);

  return {
    id: `notification-${sequence.toString().padStart(3, '0')}`,
    type,
    shipmentId: shipment.id,
    shipmentDocument: shipment.documentNumber,
    title: getNotificationTitle(type, shipment),
    description: getNotificationDescription(type, shipment),
    createdAt: getNotificationDate(shipment, sequence),
    location: getNotificationLocation(shipment, type),
    read: sequence % 3 === 0,
    status: shipment.status,
  };
}

function getNotificationType(shipment: Shipment): NotificationType {
  if (shipment.issue?.type === 'DELAY') {
    return 'DELAY';
  }

  if (shipment.container && shipment.container.remainingDays !== null && shipment.container.remainingDays <= 2) {
    return 'CONTAINER_EXPIRING';
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

function getNotificationTitle(type: NotificationType, shipment: Shipment): string {
  if (type === 'DELAY') {
    return shipment.transportMode === 'SEA' ? 'Demora en puerto' : 'Demora en tránsito';
  }

  if (type === 'DELIVERY') {
    return isContainerShipment(shipment) ? 'Entregado en destino' : 'Envío entregado';
  }

  const titles: Record<NotificationType, string> = {
    DELAY: 'Demora en puerto',
    STATUS_CHANGE: 'Cambio de estado',
    IN_TRANSIT: 'En tránsito',
    CUSTOMS: 'En aduana',
    DELIVERY: 'Envío entregado',
    DOCUMENT: 'Documento pendiente',
    CONTAINER_EXPIRING: 'Contenedor próximo a vencer',
  };

  return titles[type];
}

function getNotificationDescription(type: NotificationType, shipment: Shipment): string {
  const client = shipment.client;
  const route = `${getHub(shipment.origin.country, shipment.transportMode, shipment.origin.city)} → ${getHub(shipment.destination.country, shipment.transportMode, shipment.destination.city)}`;
  const destinationHub = getHub(shipment.destination.country, shipment.transportMode, shipment.destination.city);

  switch (type) {
    case 'DELAY': {
      const delayDays = shipment.container?.delayDays || 2;
      const place = shipment.transportMode === 'SEA' ? 'el puerto de' : 'el aeropuerto de';
      const originHub = getHub(shipment.origin.country, shipment.transportMode, shipment.origin.city);
      return `El envío de ${client} presenta una demora de ${delayDays} días en ${place} ${originHub} por ${getDelayReason(shipment.issue?.type)}. Nueva ETA: ${formatDate(shipment.logisticDates.eta)}.`;
    }
    case 'CUSTOMS':
      return `El envío de ${client} (${route}) ha pasado a estado 'En aduana'. Se estima liberación en 3-5 días hábiles.`;
    case 'IN_TRANSIT': {
      const departure = shipment.transportMode === 'SEA' ? 'ha zarpado' : 'ha despegado';
      return `El envío de ${shipment.merchandiseDescription.toLowerCase()} de ${client} (${route}) ${departure} y está en tránsito. ETA: ${formatDate(shipment.logisticDates.eta)}.`;
    }
    case 'DELIVERY':
      return isContainerShipment(shipment)
        ? `${client}: contenedor ${shipment.container?.type} entregado en ${destinationHub}. El proceso de nacionalización fue completado el ${formatDate(shipment.logisticDates.nationalization ?? shipment.logisticDates.delivery)}.`
        : `El envío de ${client} (${route}) ha sido entregado exitosamente. Fecha real de entrega: ${formatDate(shipment.logisticDates.delivery)}.`;
    case 'DOCUMENT':
      return `El envío de ${client} (${route}) tiene documentos pendientes de validación. Adjunta el soporte requerido para continuar con el proceso aduanero.`;
    case 'CONTAINER_EXPIRING': {
      const container = shipment.container;
      const reference = container?.number ?? container?.type ?? 'asignado';

      if (container?.remainingDays === 0) {
        return `El contenedor ${reference} de ${client} agotó sus ${container.freeDays} días libres en ${destinationHub}. Se generan cobros por demoraje de USD ${container.delayValuePerDay} por día.`;
      }

      const remainingDays = container?.remainingDays ?? 0;
      const remainingLabel = remainingDays === 1 ? '1 día libre' : `${remainingDays} días libres`;

      return `Al contenedor ${reference} de ${client} en ${destinationHub} le queda${remainingDays === 1 ? '' : 'n'} ${remainingLabel} de ${container?.freeDays}. Programa la devolución para evitar cobros por demoraje.`;
    }
    case 'STATUS_CHANGE':
    default:
      return `El envío de ${client} (${route}) ha pasado a estado '${getShipmentStatusLabel(shipment.status)}'.`;
  }
}

function isContainerShipment(shipment: Shipment): boolean {
  return Boolean(shipment.container && shipment.cargoType === 'FCL');
}

function getDelayReason(issueType: ShipmentIssueType | undefined): string {
  const reasons: Record<ShipmentIssueType, string> = {
    DELAY: 'congestión portuaria',
    WEATHER: 'condiciones climáticas adversas',
    CUSTOMS_INSPECTION: 'inspección aduanera',
    DOCUMENT_PENDING: 'documentación pendiente',
    NONE: 'congestión operativa',
  };

  return reasons[issueType ?? 'NONE'];
}

/**
 * Puerto o aeropuerto representativo por país, para que las notificaciones
 * simuladas lean como en los mockups ("Rotterdam, Países Bajos").
 */
function getHub(country: string, transportMode: TransportMode, city?: string | null): string {
  const seaHubs: Record<string, string> = {
    Alemania: 'Hamburgo',
    Brasil: 'Santos',
    Chile: 'Valparaíso',
    China: 'Shanghái',
    Colombia: 'Cartagena',
    España: 'Valencia',
    'Estados Unidos': 'Miami',
    México: 'Veracruz',
    Perú: 'Callao',
  };
  const airHubs: Record<string, string> = {
    Alemania: 'Fráncfort',
    Brasil: 'São Paulo',
    Chile: 'Santiago',
    China: 'Shanghái',
    Colombia: 'Bogotá',
    España: 'Madrid',
    'Estados Unidos': 'Miami',
    México: 'Ciudad de México',
    Perú: 'Lima',
  };
  const hubs = transportMode === 'SEA' ? seaHubs : airHubs;

  return hubs[country] ?? city ?? country;
}

function getNotificationLocation(shipment: Shipment, type: NotificationType): string | null {
  // El contenedor se libera en destino, así que esa alerta siempre apunta allí.
  const isDestination = type === 'CONTAINER_EXPIRING' || shipment.status === 'DELIVERED' || shipment.status === 'DESTINATION_CUSTOMS';
  const location = isDestination ? shipment.destination : shipment.origin;
  const hub = getHub(location.country, shipment.transportMode, location.city);

  return [hub, location.country].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(', ') || null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'por confirmar';
  }

  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);

  if (Number.isNaN(date.getTime())) {
    return 'por confirmar';
  }

  const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: 'UTC' }).format(date);
  const month = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');

  return `${day} ${month} ${date.getUTCFullYear()}`;
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
