import { ReportMetrics } from '../models/shipment.model';

type JsonRecord = Record<string, unknown>;

/**
 * Traduce la respuesta de `GET /reports/home` a `ReportMetrics`.
 *
 * El endpoint devuelve totales ya agregados por el backend, así que aquí no se
 * recalcula nada: solo se renombran las claves y se arma la estructura que
 * espera la pantalla de Reportes.
 */
export function mapReportsResponse(response: unknown): ReportMetrics {
  const root = asRecord(response);
  const payload = asRecord(firstPayloadItem(getValue(root, ['dataResponse', 'DataResponse']) ?? root));

  const totalShipments = readNumber(payload, ['totalClientRecords', 'totalShipments'], 0);
  const totalDelivered = readNumber(payload, ['totalDeliveredStatus', 'totalDelivered'], 0);
  const totalWithIssue = readNumber(payload, ['totalWithIssuesStatus', 'totalWithIssues', 'totalWithIssue'], 0);
  const totalPending = readNumber(payload, ['totalPendingStatus', 'totalPending'], 0);
  const totalImports = readNumber(payload, ['totalImports'], 0);
  const totalExports = readNumber(payload, ['totalExports'], 0);
  const totalAir = readNumber(payload, ['totalAirShipments', 'totalAir'], 0);
  const totalSea = readNumber(payload, ['totalOceanShipments', 'totalSea'], 0);

  return {
    totalShipments,
    totalImports,
    totalExports,
    totalAir,
    totalSea,
    totalDelivered,
    totalWithIssue,
    totalActive: Math.max(totalShipments - totalDelivered - totalWithIssue, 0),
    totalPending,
    totalBilledUsd: readNumber(payload, ['totalInvoiced', 'totalBilled'], 0),
    totalAdvancesUsd: readNumber(payload, ['totalAdvancePayment', 'totalAdvances'], 0),
    totalDelayUsd: readNumber(payload, ['totalDelays', 'totalDelay'], 0),
    // El endpoint no expone el avance de cada envío, así que no hay promedio que
    // calcular. Hoy Reportes no lo pinta; queda en 0 hasta que el backend lo mande.
    averageProgress: 0,
    byOperationType: {
      IMPO: totalImports,
      EXPO: totalExports,
    },
    byTransportMode: {
      AIR: totalAir,
      SEA: totalSea,
    },
    // El orden de las claves importa: `Reports.createStatusBreakdown` recorre
    // `byStatus` tal cual para pintar la lista "Por estado".
    byStatus: {
      PENDING: totalPending,
      ORIGIN_CUSTOMS: readNumber(payload, ['totalOriginCustomsStatus', 'totalOriginCustoms'], 0),
      IN_TRANSIT: readNumber(payload, ['totalInTransitStatus', 'totalInTransit'], 0),
      DESTINATION_CUSTOMS: readNumber(payload, ['totalDestinationCustomsStatus', 'totalDestinationCustoms'], 0),
      DELIVERED: totalDelivered,
      WITH_ISSUE: totalWithIssue,
    },
    // Sin ranking de clientes en la respuesta. Reportes omite esa tarjeta
    // mientras la lista venga vacía.
    topClients: readArray(payload, ['topClients', 'frequentClients'])
      .map((item) => toTopClient(item))
      .filter((client) => Boolean(client.client)),
    topRoutes: readArray(payload, ['frequentRoutes', 'topRoutes'])
      .map((item) => toTopRoute(item))
      .filter((route) => Boolean(route.route))
      .sort((first, second) => second.total - first.total),
  };
}

function toTopClient(value: unknown): { client: string; total: number } {
  const record = asRecord(value);

  return {
    client: readString(record, ['client', 'clientName', 'cliente']),
    total: readNumber(record, ['total', 'totalClient', 'totalShipments'], 0),
  };
}

function toTopRoute(value: unknown): { route: string; total: number } {
  const record = asRecord(value);
  const origin = readString(record, ['origin', 'originCountry', 'paisOrigen']);
  const destination = readString(record, ['destination', 'destinationCountry', 'paisDestino']);

  return {
    route: origin && destination ? `${origin} → ${destination}` : origin || destination,
    total: readNumber(record, ['totalRoute', 'total', 'totalShipments'], 0),
  };
}

function firstPayloadItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] ?? {} : value;
}

function readArray(record: JsonRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = getValue(record, [key]);

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
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

function readNumber(record: JsonRecord, keys: string[], fallback: number): number {
  const value = getValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
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
