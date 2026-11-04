import { ReportMetrics } from '../models/shipment.model';

type JsonRecord = Record<string, unknown>;

/** Cantidad de rutas que muestra "Rutas más frecuentes". */
const TOP_ROUTES_LIMIT = 5;

/**
 * Traduce la respuesta de `GET /reports/home` a `ReportMetrics`.
 *
 * `dataResponse` trae un elemento por cliente: uno solo para el rol CLIENT o al
 * filtrar por documento, y varios para ADMIN y analistas. Los totales de cada
 * cliente ya vienen agregados por el backend; aquí solo se suman entre clientes
 * para que el reporte inicial de un rol interno cubra a todos sus clientes.
 */
export function mapReportsResponse(response: unknown): ReportMetrics {
  const root = asRecord(response);
  const data = getValue(root, ['dataResponse', 'DataResponse']) ?? root;
  const payloads = (Array.isArray(data) ? data : [data]).map((item) =>
    asRecord(item),
  );
  const sum = (keys: string[]): number =>
    payloads.reduce(
      (total, payload) => total + readNumber(payload, keys, 0),
      0,
    );

  const totalShipments = sum(['totalClientRecords', 'totalShipments']);
  const totalDelivered = sum(['totalDeliveredStatus', 'totalDelivered']);
  const totalWithIssue = sum([
    'totalWithIssuesStatus',
    'totalWithIssues',
    'totalWithIssue',
  ]);
  const totalPending = sum(['totalPendingStatus', 'totalPending']);
  const totalImports = sum(['totalImports']);
  const totalExports = sum(['totalExports']);
  const totalAir = sum(['totalAirShipments', 'totalAir']);
  const totalSea = sum(['totalOceanShipments', 'totalSea']);

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
    totalBilledUsd: roundCurrency(sum(['totalInvoiced', 'totalBilled'])),
    totalAdvancesUsd: roundCurrency(
      sum(['totalAdvancePayment', 'totalAdvances']),
    ),
    totalDelayUsd: roundCurrency(sum(['totalDelays', 'totalDelay'])),
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
      ORIGIN_CUSTOMS: sum(['totalOriginCustomsStatus', 'totalOriginCustoms']),
      IN_TRANSIT: sum(['totalInTransitStatus', 'totalInTransit']),
      DESTINATION_CUSTOMS: sum([
        'totalDestinationCustomsStatus',
        'totalDestinationCustoms',
      ]),
      DELIVERED: totalDelivered,
      WITH_ISSUE: totalWithIssue,
    },
    topClients: toTopClients(payloads),
    topRoutes: toTopRoutes(payloads),
    client: toClient(payloads),
  };
}

/** Solo hay "cliente del reporte" cuando la respuesta trae uno solo. */
function toClient(
  payloads: JsonRecord[],
): { nit: string; name: string } | null {
  if (payloads.length !== 1) {
    return null;
  }

  const nit = readString(payloads[0], ['clientNit', 'nit']);
  const name = readString(payloads[0], ['clientName', 'client']);

  return nit || name ? { nit, name } : null;
}

/**
 * Suma las rutas de todos los clientes (la misma ruta puede repetirse en varios)
 * y deja las más frecuentes.
 */
function toTopRoutes(
  payloads: JsonRecord[],
): { route: string; total: number }[] {
  const totals = new Map<string, number>();

  for (const payload of payloads) {
    for (const item of readArray(payload, ['frequentRoutes', 'topRoutes'])) {
      const route = toTopRoute(item);

      if (route.route) {
        totals.set(route.route, (totals.get(route.route) ?? 0) + route.total);
      }
    }
  }

  return [...totals]
    .map(([route, total]) => ({ route, total }))
    .sort((first, second) => second.total - first.total)
    .slice(0, TOP_ROUTES_LIMIT);
}

/**
 * Prefiere el ranking explícito (`topClients`) si algún elemento lo trae. Si no,
 * lo arma con los clientes de `dataResponse` (`clientName` + `totalClientRecords`).
 */
function toTopClients(
  payloads: JsonRecord[],
): { client: string; total: number }[] {
  const explicit = payloads.flatMap((payload) =>
    readArray(payload, ['topClients', 'frequentClients']),
  );
  const items = explicit.length > 0 ? explicit : payloads;

  return items
    .map((item) => toTopClient(item))
    .filter((client) => Boolean(client.client))
    .sort((first, second) => second.total - first.total);
}

/** Evita arrastrar el error de coma flotante de la suma (p. ej. 259445.77999999997). */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toTopClient(value: unknown): { client: string; total: number } {
  const record = asRecord(value);

  return {
    client: readString(record, ['client', 'clientName', 'cliente']),
    total: readNumber(
      record,
      ['total', 'totalClient', 'totalShipments', 'totalClientRecords'],
      0,
    ),
  };
}

function toTopRoute(value: unknown): { route: string; total: number } {
  const record = asRecord(value);
  const origin = readString(record, ['origin', 'originCountry', 'paisOrigen']);
  const destination = readString(record, [
    'destination',
    'destinationCountry',
    'paisDestino',
  ]);

  return {
    route:
      origin && destination
        ? `${origin} → ${destination}`
        : origin || destination,
    total: readNumber(record, ['totalRoute', 'total', 'totalShipments'], 0),
  };
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

function readNumber(
  record: JsonRecord,
  keys: string[],
  fallback: number,
): number {
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

    const matchingKey = Object.keys(record).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );

    if (matchingKey) {
      return record[matchingKey];
    }
  }

  return undefined;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}
