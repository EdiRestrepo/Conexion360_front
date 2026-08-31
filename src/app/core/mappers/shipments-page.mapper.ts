import { PaginatedResult, SearchFilters } from '../models/common.model';
import { OperationType, Shipment, ShipmentStatus, TransportMode } from '../models/shipment.model';
import { asRecord, getValue, readArray, readNumber, readString, toDateValue } from './json-record.util';

export interface MyShipmentsSummary {
  total: number;
  imports: number;
  exports: number;
  air: number;
  sea: number;
  withIssues: number;
}

export interface MyShipmentsPage extends PaginatedResult<Shipment> {
  summary: MyShipmentsSummary;
}

export function mapShipmentsPageResponse(response: unknown, filters: SearchFilters): MyShipmentsPage {
  const root = asRecord(response);
  const payload = firstPayloadItem(getValue(root, ['dataResponse', 'DataResponse']) ?? root);
  const meta = asRecord(getValue(root, ['meta', 'Meta']));
  const payloadRecord = asRecord(payload);
  const shipments = readArray(payloadRecord, ['myShipments', 'shipments', 'envios', 'data']).map((item) => toShipment(item));
  const pageSize = readNumber(meta, ['limit', 'size', 'pageSize'], filters.pageSize ?? 10);
  const page = readNumber(meta, ['currentPage', 'page'], filters.page ?? 1);
  const totalItems = readNumber(
    meta,
    ['totalItems', 'totalRecords'],
    readNumber(payloadRecord, ['totalClientRecords', 'totalShipments'], shipments.length),
  );

  return {
    items: shipments,
    page,
    pageSize,
    totalItems,
    totalPages: readNumber(meta, ['totalPages'], Math.max(Math.ceil(totalItems / pageSize), 1)),
    summary: {
      total: readNumber(payloadRecord, ['totalClientRecords', 'totalShipments'], totalItems),
      imports: readNumber(payloadRecord, ['totalImports'], 0),
      exports: readNumber(payloadRecord, ['totalExports'], 0),
      air: readNumber(payloadRecord, ['totalAirShipments', 'totalAir'], 0),
      sea: readNumber(payloadRecord, ['totalOceanShipments', 'totalSea'], 0),
      withIssues: readNumber(payloadRecord, ['totalWithIssues', 'totalWithIssue'], 0),
    },
  };
}

function toShipment(value: unknown): Shipment {
  const record = asRecord(value);
  const documentNumber = readString(record, ['documentNumber', 'nrDocumento', 'numeroDocumento']);
  const id = readString(record, ['id', 'shipmentId', 'idShipment']) || documentNumber;

  return {
    id,
    documentNumber,
    operationType: toOperationType(readString(record, ['operationType', 'operation'])),
    transportMode: toTransportMode(readString(record, ['shipmentMode', 'transportMode', 'mode'])),
    status: toShipmentStatus(readString(record, ['state', 'status', 'estado'])),
    client: readString(record, ['clientName', 'client', 'cliente']),
    provider: '',
    incoterm: '',
    origin: {
      country: readString(record, ['origin', 'originCountry', 'paisOrigen']),
      city: null,
      terminal: null,
    },
    destination: {
      country: readString(record, ['destination', 'destinationCountry', 'paisDestino']),
      city: null,
      terminal: null,
    },
    merchandiseDescription: '',
    cargoType: 'LCL',
    packages: 0,
    weightKg: 0,
    volumeM3: 0,
    carrier: '',
    logisticDates: {
      etd: toDateValue(readString(record, ['etdDate', 'etd'])),
      atd: toDateValue(readString(record, ['atdDate', 'atd'])),
      eta: toDateValue(readString(record, ['etaDate', 'eta'])),
      ata: toDateValue(readString(record, ['ataDate', 'ata'])),
    },
    financialInfo: { advancePayment: null, invoice: null },
    events: [],
    issue: null,
    progress: 0,
    nextStop: null,
  };
}

function firstPayloadItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] ?? {} : value;
}

function toOperationType(value: string): OperationType {
  return /expo|export/i.test(value) ? 'EXPO' : 'IMPO';
}

function toTransportMode(value: string): TransportMode {
  return /sea|mar/i.test(value) ? 'SEA' : 'AIR';
}

function toShipmentStatus(value: string): ShipmentStatus {
  const normalized = value.trim().toUpperCase();

  if (/ENTREG|DELIVERED/.test(normalized)) {
    return 'DELIVERED';
  }

  if (/NOVED|ISSUE|DEMORA|RETRAS/.test(normalized)) {
    return 'WITH_ISSUE';
  }

  if (/ADUANA.*DEST|DESTINATION_CUSTOMS/.test(normalized)) {
    return 'DESTINATION_CUSTOMS';
  }

  if (/ADUANA.*ORIG|ORIGIN_CUSTOMS/.test(normalized)) {
    return 'ORIGIN_CUSTOMS';
  }

  if (/PEND/.test(normalized)) {
    return 'PENDING';
  }

  return 'IN_TRANSIT';
}
