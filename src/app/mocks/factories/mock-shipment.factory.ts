import {
  CargoType,
  Container,
  Location,
  OperationType,
  Shipment,
  ShipmentEvent,
  ShipmentFinancialInfo,
  ShipmentIssue,
  ShipmentStatus,
  TransportMode,
} from '../../core/models/shipment.model';

interface ShipmentSeed {
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
  hasContainer: boolean;
  hasAdvance: boolean;
  hasInvoice: boolean;
  issueType?: Exclude<ShipmentIssue['type'], 'NONE'>;
  delayedContainer?: boolean;
}

const shipmentSeeds: ShipmentSeed[] = [
  seed('EXPO', 'AIR', 'DELIVERED', 'Zenú', 'Global Freight Logistics S.A.S.', 'EXW', 'Colombia', 'Alemania', 'Textiles', 'LCL', 'Avianca Cargo', false, true, true),
  seed('EXPO', 'AIR', 'DELIVERED', 'Almacenes Éxito', 'Global Freight Logistics S.A.S.', 'DAP', 'Colombia', 'Brasil', 'Químicos', 'FCL', 'LATAM Cargo', false, true, true, 'CUSTOMS_INSPECTION'),
  seed('EXPO', 'SEA', 'DELIVERED', 'Postobon', 'TransOceanic Shipping Group S.A.', 'CIF', 'Colombia', 'China', 'Repuestos', 'LCL', 'CMA CGM', true, true, true),
  seed('EXPO', 'SEA', 'DELIVERED', 'Postobon', 'SkyBridge International Freight S.A.S.', 'CIF', 'Colombia', 'España', 'Textiles', 'LCL', 'Maersk', true, true, true),
  seed('EXPO', 'SEA', 'WITH_ISSUE', 'Enka', 'Andes Cargo Solutions Ltda.', 'EXW', 'Colombia', 'España', 'Alimentos', 'FCL', 'MSC', true, true, true, 'WEATHER', true),
  seed('EXPO', 'SEA', 'IN_TRANSIT', 'Postobon', 'Global Freight Logistics S.A.S.', 'FOB', 'Colombia', 'México', 'Químicos', 'LCL', 'LATAM Cargo', true, true, false),
  seed('EXPO', 'SEA', 'DESTINATION_CUSTOMS', 'Almacenes Éxito', 'SkyBridge International Freight S.A.S.', 'FOB', 'Colombia', 'Brasil', 'Electrónicos', 'LCL', 'Avianca Cargo', true, true, true, 'CUSTOMS_INSPECTION'),
  seed('IMPO', 'AIR', 'DESTINATION_CUSTOMS', 'Enka', 'SkyBridge International Freight S.A.S.', 'CPT', 'México', 'Colombia', 'Alimentos', 'LCL', 'Avianca Cargo', false, true, true, 'CUSTOMS_INSPECTION'),
  seed('IMPO', 'AIR', 'IN_TRANSIT', 'Enka', 'Global Freight Logistics S.A.S.', 'DAP', 'Chile', 'Colombia', 'Textiles', 'LCL', 'LATAM Cargo', false, false, false),
  seed('IMPO', 'AIR', 'DELIVERED', 'Postobon', 'Andes Cargo Solutions Ltda.', 'CIP', 'México', 'Colombia', 'Electrónicos', 'LCL', 'Avianca Cargo', false, false, true),
  seed('IMPO', 'SEA', 'DESTINATION_CUSTOMS', 'Postobon', 'TransOceanic Shipping Group S.A.', 'CIF', 'Chile', 'Colombia', 'Repuestos', 'FCL', 'Maersk', true, false, false),
  seed('IMPO', 'AIR', 'WITH_ISSUE', 'Enka', 'Global Freight Logistics S.A.S.', 'DAP', 'China', 'Colombia', 'Químicos', 'LCL', 'DHL Aviation', false, false, false, 'DOCUMENT_PENDING'),
  seed('IMPO', 'SEA', 'ORIGIN_CUSTOMS', 'Almacenes Éxito', 'SkyBridge International Freight S.A.S.', 'FOB', 'Perú', 'Colombia', 'Alimentos', 'FCL', 'Hapag-Lloyd', true, false, false),
  seed('IMPO', 'SEA', 'PENDING', 'Zenú', 'TransOceanic Shipping Group S.A.', 'CFR', 'España', 'Colombia', 'Repuestos', 'FCL', 'MSC', true, false, false),
  seed('EXPO', 'AIR', 'PENDING', 'Nutresa', 'Andes Cargo Solutions Ltda.', 'EXW', 'Colombia', 'Estados Unidos', 'Alimentos', 'LCL', 'DHL Aviation', false, true, false),
  seed('EXPO', 'AIR', 'ORIGIN_CUSTOMS', 'Enka', 'Global Freight Logistics S.A.S.', 'FCA', 'Colombia', 'Perú', 'Textiles', 'LCL', 'LATAM Cargo', false, false, false),
  seed('IMPO', 'SEA', 'DESTINATION_CUSTOMS', 'Almacenes Éxito', 'TransOceanic Shipping Group S.A.', 'CIF', 'Brasil', 'Colombia', 'Electrónicos', 'FCL', 'CMA CGM', true, true, true),
  seed('IMPO', 'SEA', 'DESTINATION_CUSTOMS', 'Postobon', 'SkyBridge International Freight S.A.S.', 'CIP', 'China', 'Colombia', 'Repuestos', 'FCL', 'Maersk', true, true, true),
  seed('IMPO', 'AIR', 'DESTINATION_CUSTOMS', 'Zenú', 'Andes Cargo Solutions Ltda.', 'DAP', 'Estados Unidos', 'Colombia', 'Alimentos', 'LCL', 'Avianca Cargo', false, true, true),
  seed('EXPO', 'SEA', 'WITH_ISSUE', 'Enka', 'TransOceanic Shipping Group S.A.', 'FOB', 'Colombia', 'Chile', 'Químicos', 'FCL', 'MSC', true, false, false),
  seed('IMPO', 'SEA', 'WITH_ISSUE', 'Nutresa', 'Global Freight Logistics S.A.S.', 'CIF', 'Alemania', 'Colombia', 'Maquinaria', 'FCL', 'Hapag-Lloyd', true, true, false, 'DELAY', true),
  seed('EXPO', 'AIR', 'IN_TRANSIT', 'Postobon', 'SkyBridge International Freight S.A.S.', 'DAP', 'Colombia', 'México', 'Electrónicos', 'LCL', 'DHL Aviation', false, false, true),
  seed('IMPO', 'AIR', 'PENDING', 'Almacenes Éxito', 'Andes Cargo Solutions Ltda.', 'EXW', 'España', 'Colombia', 'Textiles', 'LCL', 'LATAM Cargo', false, false, false),
  seed('EXPO', 'SEA', 'DESTINATION_CUSTOMS', 'Zenú', 'TransOceanic Shipping Group S.A.', 'CFR', 'Colombia', 'Perú', 'Alimentos', 'FCL', 'CMA CGM', true, true, true),
  seed('IMPO', 'SEA', 'DELIVERED', 'Enka', 'Global Freight Logistics S.A.S.', 'FOB', 'México', 'Colombia', 'Químicos', 'FCL', 'Maersk', true, false, true),
  seed('EXPO', 'AIR', 'WITH_ISSUE', 'Almacenes Éxito', 'SkyBridge International Freight S.A.S.', 'FCA', 'Colombia', 'Brasil', 'Electrónicos', 'LCL', 'Avianca Cargo', false, true, false, 'DOCUMENT_PENDING'),
  seed('IMPO', 'SEA', 'PENDING', 'Postobon', 'Andes Cargo Solutions Ltda.', 'EXW', 'Chile', 'Colombia', 'Repuestos', 'FCL', 'MSC', true, false, false),
  seed('EXPO', 'SEA', 'DESTINATION_CUSTOMS', 'Nutresa', 'Global Freight Logistics S.A.S.', 'CIF', 'Colombia', 'Alemania', 'Alimentos', 'LCL', 'Hapag-Lloyd', true, true, true),
  seed('IMPO', 'AIR', 'DESTINATION_CUSTOMS', 'Enka', 'SkyBridge International Freight S.A.S.', 'CPT', 'Perú', 'Colombia', 'Textiles', 'LCL', 'LATAM Cargo', false, true, true),
  seed('EXPO', 'SEA', 'DESTINATION_CUSTOMS', 'Postobon', 'TransOceanic Shipping Group S.A.', 'FOB', 'Colombia', 'España', 'Maquinaria', 'FCL', 'CMA CGM', true, false, false, 'CUSTOMS_INSPECTION'),
];

export function createMockShipments(): Shipment[] {
  return shipmentSeeds.map((item, index) => createShipment(item, index + 1));
}

function seed(
  operationType: OperationType,
  transportMode: TransportMode,
  status: ShipmentStatus,
  client: string,
  provider: string,
  incoterm: string,
  originCountry: string,
  destinationCountry: string,
  merchandiseDescription: string,
  cargoType: CargoType,
  carrier: string,
  hasContainer: boolean,
  hasAdvance: boolean,
  hasInvoice: boolean,
  issueType?: Exclude<ShipmentIssue['type'], 'NONE'>,
  delayedContainer = false,
): ShipmentSeed {
  return {
    operationType,
    transportMode,
    status,
    client,
    provider,
    incoterm,
    origin: createLocation(originCountry, operationType === 'EXPO' ? 'Medellín' : null),
    destination: createLocation(destinationCountry, destinationCountry === 'Colombia' ? 'Bogotá' : null),
    merchandiseDescription,
    cargoType,
    packages: cargoType === 'FCL' ? 120 : 42,
    weightKg: cargoType === 'FCL' ? 12850 : 3450,
    volumeM3: cargoType === 'FCL' ? 67.4 : 18.2,
    carrier,
    hasContainer,
    hasAdvance,
    hasInvoice,
    issueType,
    delayedContainer,
  };
}

function createShipment(seedItem: ShipmentSeed, sequence: number): Shipment {
  const baseDay = 2 + sequence;
  const id = `shipment-${sequence.toString().padStart(3, '0')}`;
  const documentPrefix = seedItem.transportMode === 'AIR' ? 'AWB' : 'HBL';
  const documentNumber = `${documentPrefix}-${stableCode(sequence)}`;
  const logisticDates = createLogisticDates(seedItem.status, baseDay);
  const issue = createIssue(seedItem, sequence);

  return {
    id,
    documentNumber,
    operationType: seedItem.operationType,
    transportMode: seedItem.transportMode,
    status: seedItem.status,
    client: seedItem.client,
    provider: seedItem.provider,
    incoterm: seedItem.incoterm,
    origin: seedItem.origin,
    destination: seedItem.destination,
    merchandiseDescription: seedItem.merchandiseDescription,
    cargoType: seedItem.cargoType,
    packages: seedItem.packages + sequence,
    weightKg: seedItem.weightKg + sequence * 37,
    volumeM3: Number((seedItem.volumeM3 + sequence * 0.7).toFixed(2)),
    carrier: seedItem.carrier,
    logisticDates,
    container: createContainer(seedItem, sequence),
    financialInfo: createFinancialInfo(seedItem, sequence),
    events: createEvents(id, seedItem, logisticDates),
    issue,
    progress: getProgress(seedItem.status),
    nextStop: getNextStop(seedItem.status),
  };
}

function createLocation(country: string, city: string | null): Location {
  const coordinates = getCountryCoordinates(country);

  return {
    country,
    city,
    terminal: city ? `${city} Terminal logística` : null,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  };
}

function getCountryCoordinates(country: string): Pick<Location, 'latitude' | 'longitude'> | null {
  const coordinates: Record<string, Pick<Location, 'latitude' | 'longitude'>> = {
    Alemania: { latitude: 50.1109, longitude: 8.6821 },
    Brasil: { latitude: -23.5505, longitude: -46.6333 },
    Chile: { latitude: -33.4489, longitude: -70.6693 },
    China: { latitude: 31.2304, longitude: 121.4737 },
    Colombia: { latitude: 4.711, longitude: -74.0721 },
    'Estados Unidos': { latitude: 25.7617, longitude: -80.1918 },
    México: { latitude: 19.4326, longitude: -99.1332 },
    Perú: { latitude: -12.0464, longitude: -77.0428 },
  };

  return coordinates[country] ?? null;
}

function createLogisticDates(status: ShipmentStatus, baseDay: number) {
  const originWarehouse = isoDate(baseDay);
  const etd = isoDate(baseDay + 2);
  const atd = status === 'PENDING' ? null : isoDate(baseDay + 3);
  const eta = isoDate(baseDay + 9);
  const ata = getProgress(status) >= 55 ? isoDate(baseDay + 10) : null;
  const destinationWarehouse = getProgress(status) >= 70 ? isoDate(baseDay + 12) : null;
  const nationalization = getProgress(status) >= 62 ? isoDate(baseDay + 11) : null;
  const dispatch = getProgress(status) >= 80 ? isoDate(baseDay + 13) : null;
  const planilla = getProgress(status) >= 85 ? isoDate(baseDay + 14) : null;
  const delivery = status === 'DELIVERED' ? isoDate(baseDay + 16) : null;

  return { originWarehouse, etd, atd, eta, ata, destinationWarehouse, nationalization, dispatch, planilla, delivery };
}

function createContainer(seedItem: ShipmentSeed, sequence: number): Container | null | undefined {
  if (seedItem.transportMode === 'AIR') {
    return undefined;
  }

  if (!seedItem.hasContainer) {
    return null;
  }

  const delayDays = seedItem.delayedContainer ? 4 : 0;
  const delayValuePerDay = seedItem.delayedContainer ? 95 : 0;

  return {
    type: sequence % 3 === 0 ? '40HC' : sequence % 2 === 0 ? '20GP' : '40GP',
    quantity: seedItem.cargoType === 'FCL' ? (sequence % 4) + 1 : 0,
    number: seedItem.cargoType === 'FCL' ? `CONT${(7000000 + sequence * 379).toString()}` : null,
    freeDays: 8 + (sequence % 5),
    remainingDays: seedItem.delayedContainer ? 0 : sequence % 9,
    returnDate: seedItem.status === 'DELIVERED' ? isoDate(sequence + 24) : null,
    delayDays,
    delayValuePerDay,
    totalDelayValue: delayDays * delayValuePerDay,
    deposit: 'Depósito Cartagena',
  };
}

function createFinancialInfo(seedItem: ShipmentSeed, sequence: number): ShipmentFinancialInfo {
  const advanceAmount = seedItem.hasAdvance ? 900 + sequence * 73 : 0;
  const expenseValue = seedItem.hasInvoice ? 1500 + sequence * 121 : 0;
  const subtotal = seedItem.hasInvoice ? expenseValue + 480 : 0;
  const tax = seedItem.hasInvoice ? Number((subtotal * 0.19).toFixed(2)) : 0;

  return {
    advancePayment: seedItem.hasAdvance
      ? {
          requestedAt: isoDate(sequence + 1),
          paidAt: sequence % 4 === 0 ? null : isoDate(sequence + 3),
          amount: advanceAmount,
        }
      : null,
    invoice: seedItem.hasInvoice
      ? {
          providerInvoice: `FP-${stableCode(sequence + 40)}`,
          tccInvoice: `FT-${stableCode(sequence + 80)}`,
          invoiceNumber: `FAC-${stableCode(sequence + 120)}`,
          invoiceDate: isoDate(sequence + 20),
          expenseDescription: sequence % 2 === 0 ? 'Flete internacional' : 'Gastos portuarios',
          expenseValue,
          subtotal,
          tax,
          total: Number((subtotal + tax).toFixed(2)),
        }
      : null,
  };
}

function createEvents(shipmentId: string, seedItem: ShipmentSeed, logisticDates: ReturnType<typeof createLogisticDates>): ShipmentEvent[] {
  const events: ShipmentEvent[] = [
    createEvent(shipmentId, 1, logisticDates.originWarehouse, 'PENDING', seedItem.origin, 'Ingreso a bodega de origen.'),
  ];

  if (logisticDates.atd) {
    events.push(createEvent(shipmentId, 2, logisticDates.atd, 'IN_TRANSIT', seedItem.origin, 'Salida confirmada desde origen.'));
  }

  if (logisticDates.ata) {
    events.push(createEvent(shipmentId, 3, logisticDates.ata, 'DESTINATION_CUSTOMS', seedItem.destination, 'Arribo a destino y validación aduanera.'));
  }

  if (seedItem.status === 'WITH_ISSUE') {
    events.push(createEvent(shipmentId, 4, isoDate(28), 'WITH_ISSUE', seedItem.destination, 'Novedad logística registrada.'));
  }

  if (logisticDates.delivery) {
    events.push(createEvent(shipmentId, 5, logisticDates.delivery, 'DELIVERED', seedItem.destination, 'Entrega final completada.'));
  }

  return events;
}

function createEvent(
  shipmentId: string,
  sequence: number,
  date: string | null | undefined,
  status: ShipmentStatus,
  location: Location,
  description: string,
): ShipmentEvent {
  return {
    id: `${shipmentId}-event-${sequence}`,
    dateTime: `${date ?? '2026-01-01'}T0${Math.min(sequence + 7, 9)}:30:00.000Z`,
    status,
    location,
    description,
    source: 'Sistema mock Conexion360',
    user: sequence % 2 === 0 ? 'Equipo operaciones' : null,
  };
}

function createIssue(seedItem: ShipmentSeed, sequence: number): ShipmentIssue | null {
  if (!seedItem.issueType) {
    return null;
  }

  const comments: Record<Exclude<ShipmentIssue['type'], 'NONE'>, string> = {
    DELAY: 'Retraso operativo en la ruta internacional.',
    CUSTOMS_INSPECTION: 'Inspección aduanera pendiente de cierre.',
    DOCUMENT_PENDING: 'Documento pendiente de validación.',
    WEATHER: 'Retraso por condiciones climáticas.',
  };

  return {
    type: seedItem.issueType,
    comment: comments[seedItem.issueType],
    date: isoDate(sequence + 18),
    resolved: sequence % 2 === 0,
  };
}

function getProgress(status: ShipmentStatus): number {
  const values: Record<ShipmentStatus, number> = {
    PENDING: 5,
    ORIGIN_CUSTOMS: 28,
    IN_TRANSIT: 45,
    DESTINATION_CUSTOMS: 58,
    DELIVERED: 100,
    WITH_ISSUE: 52,
  };
  return values[status];
}

function getNextStop(status: ShipmentStatus): string | null {
  const values: Record<ShipmentStatus, string | null> = {
    PENDING: 'Aduana origen',
    ORIGIN_CUSTOMS: 'Salida origen',
    IN_TRANSIT: 'Aduana destino',
    DESTINATION_CUSTOMS: 'Entrega',
    DELIVERED: null,
    WITH_ISSUE: 'Gestión de novedad',
  };
  return values[status];
}

function isoDate(day: number): string {
  const date = new Date(Date.UTC(2026, 0, day));
  return date.toISOString().slice(0, 10);
}

function stableCode(value: number): string {
  return (value * 7919).toString(36).toUpperCase().padStart(8, '0').slice(-8);
}
