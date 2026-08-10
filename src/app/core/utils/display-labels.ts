import { OperationType, ShipmentDocumentStatus, ShipmentIssue, ShipmentStatus, TransportMode } from '../models/shipment.model';
import { UserRole } from '../models/user.model';

export type ShipmentChipType = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const operationLabels: Record<OperationType, string> = {
  IMPO: 'Importación',
  EXPO: 'Exportación',
};

const transportModeLabels: Record<TransportMode, string> = {
  AIR: 'Aéreo',
  SEA: 'Marítimo',
};

const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  PENDING: 'Pendiente',
  ORIGIN_CUSTOMS: 'En Aduana origen',
  IN_TRANSIT: 'En tránsito',
  DESTINATION_CUSTOMS: 'En Aduana destino',
  DELIVERED: 'Entregado',
  WITH_ISSUE: 'Con novedad',
};

const shipmentStatusChipTypes: Record<ShipmentStatus, ShipmentChipType> = {
  PENDING: 'neutral',
  ORIGIN_CUSTOMS: 'warning',
  IN_TRANSIT: 'info',
  DESTINATION_CUSTOMS: 'warning',
  DELIVERED: 'success',
  WITH_ISSUE: 'danger',
};

const shipmentStatusIcons: Record<ShipmentStatus, string> = {
  PENDING: 'schedule',
  ORIGIN_CUSTOMS: 'fact_check',
  IN_TRANSIT: 'local_shipping',
  DESTINATION_CUSTOMS: 'gavel',
  DELIVERED: 'check_circle',
  WITH_ISSUE: 'warning',
};

const shipmentStatusOrder: Record<ShipmentStatus, number> = {
  PENDING: 0,
  ORIGIN_CUSTOMS: 1,
  IN_TRANSIT: 2,
  DESTINATION_CUSTOMS: 3,
  DELIVERED: 4,
  WITH_ISSUE: 3,
};

const documentStatusLabels: Record<ShipmentDocumentStatus, string> = {
  AVAILABLE: 'Disponible',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
};

const documentStatusChipTypes: Record<ShipmentDocumentStatus, ShipmentChipType> = {
  AVAILABLE: 'success',
  PENDING: 'info',
  REJECTED: 'danger',
  EXPIRED: 'warning',
};

const documentStatusIcons: Record<ShipmentDocumentStatus, string> = {
  AVAILABLE: 'task_alt',
  PENDING: 'hourglass_top',
  REJECTED: 'block',
  EXPIRED: 'event_busy',
};

const shipmentIssueTitles: Record<ShipmentIssue['type'], string> = {
  DELAY: 'Retraso logístico',
  CUSTOMS_INSPECTION: 'Inspección aduanera',
  DOCUMENT_PENDING: 'Documento pendiente',
  WEATHER: 'Condición climática',
  NONE: 'Sin novedad',
};

const userRoleLabels: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  ADMIN: 'Administrador',
  ANALISTAOPE: 'Analista operativo',
  ANALISTASAC: 'Analista de servicio al cliente',
};

export function getOperationTypeLabel(value: OperationType): string {
  return operationLabels[value];
}

export function getOperationTypeIcon(value: OperationType): string {
  return value === 'IMPO' ? 'call_received' : 'call_made';
}

export function getTransportModeLabel(value: TransportMode): string {
  return transportModeLabels[value];
}

export function getTransportModeIcon(value: TransportMode): string {
  return value === 'AIR' ? 'flight' : 'directions_boat';
}

export function getShipmentStatusLabel(value: ShipmentStatus): string {
  return shipmentStatusLabels[value];
}

export function getShipmentStatusChipType(value: ShipmentStatus): ShipmentChipType {
  return shipmentStatusChipTypes[value];
}

export function getShipmentStatusIcon(value: ShipmentStatus): string {
  return shipmentStatusIcons[value];
}

export function getShipmentStatusOrder(value: ShipmentStatus): number {
  return shipmentStatusOrder[value];
}

export function getShipmentIssueTitle(value: ShipmentIssue): string {
  return shipmentIssueTitles[value.type];
}

export function isTerminalShipmentStatus(value: ShipmentStatus): boolean {
  return value === 'DELIVERED';
}

export function getDocumentStatusLabel(value: ShipmentDocumentStatus): string {
  return documentStatusLabels[value];
}

export function getDocumentStatusChipType(value: ShipmentDocumentStatus): ShipmentChipType {
  return documentStatusChipTypes[value];
}

export function getDocumentStatusIcon(value: ShipmentDocumentStatus): string {
  return documentStatusIcons[value];
}
export function getUserRoleLabel(value: UserRole): string {
  return userRoleLabels[value];
}
