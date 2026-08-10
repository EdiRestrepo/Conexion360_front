export type OperationType = 'IMPO' | 'EXPO';

export type TransportMode = 'AIR' | 'SEA';

export type CargoType = 'FCL' | 'LCL';

export type ShipmentStatus =
  | 'PENDING'
  | 'ORIGIN_CUSTOMS'
  | 'IN_TRANSIT'
  | 'DESTINATION_CUSTOMS'
  | 'DELIVERED'
  | 'WITH_ISSUE';

export type ShipmentIssueType = 'DELAY' | 'CUSTOMS_INSPECTION' | 'DOCUMENT_PENDING' | 'WEATHER' | 'NONE';

export interface Location {
  country: string;
  city?: string | null;
  terminal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LogisticDates {
  originWarehouse?: string | null;
  etd?: string | null;
  atd?: string | null;
  eta?: string | null;
  ata?: string | null;
  destinationWarehouse?: string | null;
  nationalization?: string | null;
  dispatch?: string | null;
  planilla?: string | null;
  delivery?: string | null;
}

export interface Container {
  type: string | null;
  quantity: number;
  number: string | null;
  freeDays: number | null;
  remainingDays: number | null;
  returnDate: string | null;
  delayDays: number;
  delayValuePerDay: number;
  totalDelayValue: number;
  deposit: string | null;
}

export interface AdvancePayment {
  requestedAt: string | null;
  paidAt: string | null;
  amount: number;
}

export interface Invoice {
  providerInvoice: string | null;
  tccInvoice: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  expenseDescription: string | null;
  expenseValue: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface ShipmentFinancialInfo {
  advancePayment: AdvancePayment | null;
  invoice: Invoice | null;
}

export interface ShipmentIssue {
  type: ShipmentIssueType;
  comment: string;
  date: string;
  resolved: boolean;
}

export type ShipmentEventType = 'STATUS' | 'COMMENT' | 'DATE';

export interface ShipmentEvent {
  id: string;
  dateTime: string;
  status: ShipmentStatus;
  location: Location;
  description: string;
  source: string;
  user?: string | null;
  type?: ShipmentEventType;
  label?: string | null;
  previousValue?: string | null;
  title?: string | null;
}

export interface Shipment {
  id: string;
  documentNumber: string;
  operationType: OperationType;
  transportMode: TransportMode;
  status: ShipmentStatus;
  client: string;
  provider: string;
  incoterm: string;
  origin: Location;
  destination: Location;
  merchandiseDescription: string;
  cargoType: CargoType;
  packages: number;
  weightKg: number;
  volumeM3: number;
  carrier: string;
  logisticDates: LogisticDates;
  container?: Container | null;
  financialInfo: ShipmentFinancialInfo;
  events: ShipmentEvent[];
  issue?: ShipmentIssue | null;
  progress: number;
  nextStop?: string | null;
}

export interface DashboardMetrics {
  totalShipments: number;
  totalImports: number;
  totalExports: number;
  totalAir: number;
  totalSea: number;
  totalDelivered: number;
  totalWithIssue: number;
  totalActive: number;
  totalPending: number;
}

export interface ReportMetrics extends DashboardMetrics {
  totalBilledUsd: number;
  totalAdvancesUsd: number;
  totalDelayUsd: number;
  averageProgress: number;
  byOperationType: Record<OperationType, number>;
  byTransportMode: Record<TransportMode, number>;
  byStatus: Record<ShipmentStatus, number>;
  topClients: { client: string; total: number }[];
}
