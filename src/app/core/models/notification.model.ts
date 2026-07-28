import { ShipmentStatus } from './shipment.model';

export type NotificationType =
  | 'DELAY'
  | 'STATUS_CHANGE'
  | 'IN_TRANSIT'
  | 'CUSTOMS'
  | 'DELIVERY'
  | 'DOCUMENT'
  | 'CONTAINER_EXPIRING';

export interface Notification {
  id: string;
  type: NotificationType;
  shipmentId: string;
  shipmentDocument: string;
  title: string;
  description: string;
  createdAt: string;
  location: string | null;
  read: boolean;
  status?: ShipmentStatus;
}

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}