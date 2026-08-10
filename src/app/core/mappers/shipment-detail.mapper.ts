import {
  AdvancePayment,
  CargoType,
  Container,
  Invoice,
  Location,
  LogisticDates,
  OperationType,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
  TransportMode,
} from '../models/shipment.model';

type JsonRecord = Record<string, unknown>;

const shipmentStatusOrder: Record<ShipmentStatus, number> = {
  PENDING: 0,
  ORIGIN_CUSTOMS: 1,
  IN_TRANSIT: 2,
  DESTINATION_CUSTOMS: 3,
  DELIVERED: 4,
  WITH_ISSUE: 3,
};

export function mapShipmentDetailResponse(response: unknown, fallbackId = ''): Shipment | null {
  const root = asRecord(response);
  const payload = asRecord(getValue(root, ['dataResponse', 'DataResponse']) ?? root);
  const summary = asRecord(getValue(payload, ['resumenShipments']));
  const tracking = asRecord(getValue(payload, ['trackingShipments']));
  const dates = asRecord(getValue(payload, ['logisticsDatesShipments']));
  const container = asRecord(getValue(payload, ['containerShipments']));
  const financial = asRecord(getValue(payload, ['financialInfoShipments']));
  const history = asRecord(getValue(payload, ['historyShipments']));

  const documentNumber = readString(summary, ['documentNumber']);

  if (!documentNumber) {
    return null;
  }

  const status = toShipmentStatus(readString(tracking, ['state']));
  // El nombre del país que acompaña a las coordenadas puede llegar en idioma local
  // (Deutschland, 中国), por eso la etiqueta visible sale siempre del resumen.
  const origin = toLocation(readString(summary, ['origin']), tracking, 'origin');
  const destination = toLocation(readString(summary, ['destination']), tracking, 'destination');

  return {
    id: fallbackId || documentNumber,
    documentNumber,
    documentType: readString(summary, ['documentType']) || null,
    operationType: toOperationType(readString(summary, ['operationType'])),
    transportMode: toTransportMode(readString(summary, ['shipmentMode'])),
    status,
    client: readString(summary, ['clientName']),
    provider: readString(summary, ['supplier']),
    incoterm: readString(summary, ['incoterm']),
    origin,
    destination,
    merchandiseDescription: readString(summary, ['merchandiseDescription']),
    cargoType: toCargoType(readString(summary, ['loadType'])),
    packages: readNumber(summary, ['packagesNumbers'], 0),
    weightKg: readNumber(summary, ['weightKg'], 0),
    volumeM3: readNumber(summary, ['volumeM3'], 0),
    carrier: readString(summary, ['carrier']),
    logisticDates: toLogisticDates(dates),
    container: toContainer(container),
    financialInfo: {
      advancePayment: toAdvancePayment(financial),
      invoice: toInvoice(financial),
    },
    events: toEvents(history, documentNumber, origin, status),
    issue: null,
    progress: toProgress(status),
    nextStop: null,
  };
}

function toLocation(country: string, tracking: JsonRecord, prefix: 'origin' | 'destination'): Location {
  return {
    country: country || readString(tracking, [`${prefix}NameCoordinates`]),
    city: null,
    terminal: null,
    latitude: readNullableNumber(tracking, [`${prefix}LatitudCoordinates`]),
    longitude: readNullableNumber(tracking, [`${prefix}LongitudCoordinates`]),
  };
}

function toLogisticDates(record: JsonRecord): LogisticDates {
  return {
    originWarehouse: toDateValue(readString(record, ['storeOriginDate'])),
    etd: toDateValue(readString(record, ['etdDate'])),
    atd: toDateValue(readString(record, ['atdDate'])),
    eta: toDateValue(readString(record, ['etaDate'])),
    ata: toDateValue(readString(record, ['ataDate'])),
    destinationWarehouse: toDateValue(readString(record, ['storeDestinationDate'])),
    nationalization: toDateValue(readString(record, ['nationalizationDate'])),
    dispatch: toDateValue(readString(record, ['dispatchDestinationDate'])),
    planilla: toDateValue(readString(record, ['formDate'])),
    delivery: toDateValue(readString(record, ['containerDeliveryDate'])),
  };
}

function toContainer(record: JsonRecord): Container | null {
  const type = readString(record, ['containerType']);
  const number = readString(record, ['containerNumber']);
  const quantity = readNullableNumber(record, ['containerAmount']);

  if (!type && !number && quantity === null) {
    return null;
  }

  return {
    type: type || null,
    quantity: quantity ?? 0,
    number: number || null,
    freeDays: readNullableNumber(record, ['daysOff']),
    remainingDays: readNullableNumber(record, ['daysRemainingDelivery']),
    returnDate: toDateValue(readString(record, ['actualContainerReturnDate'])),
    delayDays: readNumber(record, ['containerDelayDays'], 0),
    delayValuePerDay: readNumber(record, ['costDayOfDelay'], 0),
    totalDelayValue: readNumber(record, ['totalCostContainerDelays'], 0),
    deposit: readString(record, ['containerDepot']) || null,
  };
}

function toAdvancePayment(record: JsonRecord): AdvancePayment | null {
  const requestedAt = toDateValue(readString(record, ['advancePaymentRequestDate']));
  const paidAt = toDateValue(readString(record, ['advancePaymentDate']));
  const amount = readNullableNumber(record, ['advancePaymentAmount']);

  if (!requestedAt && !paidAt && amount === null) {
    return null;
  }

  return { requestedAt, paidAt, amount };
}

function toInvoice(record: JsonRecord): Invoice | null {
  const invoice: Invoice = {
    providerInvoice: readString(record, ['supplierInvoice']) || null,
    tccInvoice: readString(record, ['tccInvoice']) || null,
    invoiceNumber: readString(record, ['invoiceNumber']) || null,
    invoiceDate: toDateValue(readString(record, ['invoiceDate'])),
    expenseDescription: readString(record, ['expenseDescription']) || null,
    expenseValue: readNullableNumber(record, ['expenseAmountUSD']),
    subtotal: readNullableNumber(record, ['invoiceSubtotalUSD']),
    tax: readNullableNumber(record, ['ivaUSD']),
    total: readNullableNumber(record, ['totalInvoiceUSD']),
  };

  return Object.values(invoice).every((value) => value === null) ? null : invoice;
}

function toEvents(history: JsonRecord, documentNumber: string, location: Location, fallbackStatus: ShipmentStatus): ShipmentEvent[] {
  return readArray(history, ['detailsHistoryShipments']).map((item, index) => {
    const record = asRecord(item);
    const newState = readString(record, ['newState']);
    const previousState = readString(record, ['oldState']);

    return {
      id: `${documentNumber}-history-${index}`,
      dateTime: readString(record, ['changeDate']),
      status: newState ? toShipmentStatus(newState) : fallbackStatus,
      location,
      description: readString(record, ['message']),
      source: 'Conexion360',
      user: readString(record, ['changeUser']) || null,
      // Sin estado anterior (creación del envío) se omite para que la tarjeta no muestre flecha.
      previousValue: previousState || undefined,
    };
  });
}

function readArray(record: JsonRecord, keys: string[]): unknown[] {
  const value = getValue(record, keys);

  return Array.isArray(value) ? value : [];
}

function readString(record: JsonRecord, keys: string[]): string {
  const value = getValue(record, keys);

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function readNullableNumber(record: JsonRecord, keys: string[]): number | null {
  const value = getValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNumber(record: JsonRecord, keys: string[], fallback: number): number {
  return readNullableNumber(record, keys) ?? fallback;
}

function getValue(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const directValue = record[key];

    if (directValue !== undefined) {
      return directValue;
    }

    const matchingKey = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());

    if (matchingKey) {
      return record[matchingKey];
    }
  }

  return undefined;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function toDateValue(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed || trimmed.startsWith('0001-01-01')) {
    return null;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  // El backend entrega algunas fechas con cultura estadounidense: MM/DD/YYYY.
  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);

  if (usDate) {
    return `${usDate[3]}-${usDate[1].padStart(2, '0')}-${usDate[2].padStart(2, '0')}`;
  }

  return null;
}

function toOperationType(value: string): OperationType {
  return /expo|export/i.test(value) ? 'EXPO' : 'IMPO';
}

function toTransportMode(value: string): TransportMode {
  return /sea|mar/i.test(value) ? 'SEA' : 'AIR';
}

function toCargoType(value: string): CargoType {
  return /fcl/i.test(value) ? 'FCL' : 'LCL';
}

function toProgress(status: ShipmentStatus): number {
  if (status === 'DELIVERED') {
    return 100;
  }

  return Math.round((shipmentStatusOrder[status] / 4) * 100);
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
