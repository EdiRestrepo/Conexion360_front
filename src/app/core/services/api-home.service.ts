import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResult, SearchFilters } from '../models/common.model';
import {
  DashboardMetrics,
  OperationType,
  ReportMetrics,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from '../models/shipment.model';
import { isTerminalShipmentStatus } from '../utils/display-labels';

type JsonRecord = Record<string, unknown>;

interface HomeDashboardData {
  metrics: DashboardMetrics;
  reportMetrics: ReportMetrics;
  recentShipments: Shipment[];
}

const emptyStatusTotals: Record<ShipmentStatus, number> = {
  PENDING: 0,
  ORIGIN_WAREHOUSE: 0,
  ORIGIN_CUSTOMS: 0,
  IN_TRANSIT: 0,
  DESTINATION_CUSTOMS: 0,
  NATIONALIZED: 0,
  DESTINATION_WAREHOUSE: 0,
  DISPATCHED: 0,
  DELIVERED: 0,
  WITH_ISSUE: 0,
  CANCELLED: 0,
};

@Injectable({
  providedIn: 'root',
})
export class ApiHomeService {
  private readonly http = inject(HttpClient);
  private readonly homeUrl = `${environment.api.baseUrl}/home/totals`;
  private readonly dashboardData$ = this.http
    .get<unknown>(this.homeUrl, {
      params: new HttpParams()
        .set('idClient', environment.api.homeClientId)
        .set('rol', environment.api.homeRole),
    })
    .pipe(
      map((response) => this.toHomeDashboardData(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.dashboardData$.pipe(map((data) => data.metrics));
  }

  getReportMetrics(): Observable<ReportMetrics> {
    return this.dashboardData$.pipe(map((data) => data.reportMetrics));
  }

  getRecent(limit: number): Observable<Shipment[]> {
    return this.dashboardData$.pipe(map((data) => data.recentShipments.slice(0, Math.max(limit, 0))));
  }

  search(filters: SearchFilters): Observable<PaginatedResult<Shipment>> {
    return this.dashboardData$.pipe(map((data) => this.paginate(this.filterShipments(data.recentShipments, filters), filters)));
  }

  private toHomeDashboardData(response: unknown): HomeDashboardData {
    const payload = this.unwrapPayload(response);
    const recentShipments = this.readArray(payload, [
      'recentShipments',
      'latestShipments',
      'shipments',
      'envios',
      'enviosRecientes',
      'registros',
      'ultimosRegistros',
      'ultimos10',
      'data',
    ]).map((item, index) => this.toShipment(item, index));
    const metrics = this.toDashboardMetrics(payload, recentShipments);

    return {
      metrics,
      reportMetrics: this.toReportMetrics(payload, metrics, recentShipments),
      recentShipments,
    };
  }

  private unwrapPayload(response: unknown): unknown {
    if (Array.isArray(response)) {
      return { data: response };
    }

    const root = this.asRecord(response);
    const dataResponse = this.getValue(root, ['dataResponse', 'DataResponse']);

    if (dataResponse !== undefined && dataResponse !== null) {
      return dataResponse;
    }

    return root;
  }

  private toDashboardMetrics(payload: unknown, shipments: Shipment[]): DashboardMetrics {
    const record = this.asRecord(payload);
    const totalShipments = this.readNumber(record, ['totalShipments', 'totalEnvios', 'totalRegistros', 'total', 'cantidadTotal'], shipments.length);
    const totalImports = this.readNumber(record, ['totalImports', 'totalImportaciones', 'importaciones', 'totalImpo'], this.countOperation(shipments, 'IMPO'));
    const totalExports = this.readNumber(record, ['totalExports', 'totalExportaciones', 'exportaciones', 'totalExpo'], this.countOperation(shipments, 'EXPO'));
    const totalAir = this.readNumber(record, ['totalAir', 'totalAereos', 'aereos', 'totalModalidadAerea'], this.countMode(shipments, 'AIR'));
    const totalSea = this.readNumber(record, ['totalSea', 'totalMaritimos', 'maritimos', 'totalModalidadMaritima'], this.countMode(shipments, 'SEA'));
    const totalDelivered = this.readNumber(record, ['totalDelivered', 'totalEntregados', 'entregados'], this.countStatus(shipments, 'DELIVERED'));
    const totalWithIssue = this.readNumber(record, ['totalWithIssue', 'totalConNovedad', 'conNovedad', 'novedades'], this.countStatus(shipments, 'WITH_ISSUE'));
    const totalActive = this.readNumber(
      record,
      ['totalActive', 'totalActivos', 'activos'],
      Math.max(totalShipments - totalDelivered - this.countStatus(shipments, 'CANCELLED'), 0),
    );

    return {
      totalShipments,
      totalImports,
      totalExports,
      totalAir,
      totalSea,
      totalDelivered,
      totalWithIssue,
      totalActive,
      totalPending: this.readNumber(record, ['totalPending', 'totalPendientes', 'pendientes'], this.countStatus(shipments, 'PENDING')),
    };
  }

  private toReportMetrics(payload: unknown, metrics: DashboardMetrics, shipments: Shipment[]): ReportMetrics {
    const record = this.asRecord(payload);

    return {
      ...metrics,
      totalBilledUsd: this.readNumber(record, ['totalBilledUsd', 'totalFacturado', 'totalFacturadoUsd'], 0),
      totalAdvancesUsd: this.readNumber(record, ['totalAdvancesUsd', 'totalAnticipos', 'totalAnticiposUsd'], 0),
      totalDelayUsd: this.readNumber(record, ['totalDelayUsd', 'totalDemoras', 'totalDemorasUsd'], 0),
      averageProgress: shipments.length ? Math.round(shipments.reduce((sum, shipment) => sum + shipment.progress, 0) / shipments.length) : 0,
      byOperationType: {
        IMPO: metrics.totalImports,
        EXPO: metrics.totalExports,
      },
      byTransportMode: {
        AIR: metrics.totalAir,
        SEA: metrics.totalSea,
      },
      byStatus: this.countStatuses(shipments, metrics),
      topClients: this.getTopClients(shipments),
    };
  }

  private toShipment(value: unknown, index: number): Shipment {
    const record = this.asRecord(value);
    const operationType = this.toOperationType(this.readString(record, ['operationType', 'tipoOperacion', 'operacion', 'operation']));
    const transportMode = this.toTransportMode(this.readString(record, ['transportMode', 'modalidad', 'modalidadTransporte', 'mode']));
    const status = this.toShipmentStatus(this.readString(record, ['status', 'estado', 'estadoLogistico']));
    const documentNumber =
      this.readString(record, ['documentNumber', 'documentoTransporte', 'numeroDocumento', 'nroDocumento', 'hbl', 'awb', 'mbl', 'guia']) ||
      `ENVIO-${index + 1}`;

    return {
      id: this.readString(record, ['id', 'shipmentId', 'idShipment', 'idEnvio']) || documentNumber,
      documentNumber,
      operationType,
      transportMode,
      status,
      client: this.readString(record, ['client', 'cliente', 'customer']) || 'Cliente',
      provider: this.readString(record, ['provider', 'proveedor']) || 'Proveedor logistico',
      incoterm: this.readString(record, ['incoterm']) || 'N/D',
      origin: {
        country: this.readString(record, ['originCountry', 'paisOrigen', 'origen', 'origin']) || 'Origen',
        city: this.readString(record, ['originCity', 'ciudadOrigen']) || null,
        terminal: this.readString(record, ['originTerminal', 'terminalOrigen']) || null,
      },
      destination: {
        country: this.readString(record, ['destinationCountry', 'paisDestino', 'destino', 'destination']) || 'Destino',
        city: this.readString(record, ['destinationCity', 'ciudadDestino']) || null,
        terminal: this.readString(record, ['destinationTerminal', 'terminalDestino']) || null,
      },
      merchandiseDescription: this.readString(record, ['merchandiseDescription', 'mercancia', 'descripcionMercancia']) || 'Mercancia',
      cargoType: this.readString(record, ['cargoType', 'tipoCarga']).toUpperCase() === 'FCL' ? 'FCL' : 'LCL',
      packages: this.readNumber(record, ['packages', 'bultos', 'piezas'], 0),
      weightKg: this.readNumber(record, ['weightKg', 'pesoKg', 'peso'], 0),
      volumeM3: this.readNumber(record, ['volumeM3', 'volumenM3', 'volumen'], 0),
      carrier: this.readString(record, ['carrier', 'transportador', 'naviera', 'aerolinea']) || 'N/D',
      logisticDates: {
        etd: this.readString(record, ['etd']) || null,
        atd: this.readString(record, ['atd']) || null,
        eta: this.readString(record, ['eta']) || null,
        ata: this.readString(record, ['ata']) || null,
      },
      financialInfo: { advancePayment: null, invoice: null },
      documents: [],
      events: [],
      issue: status === 'WITH_ISSUE' ? { type: 'DELAY', comment: 'Novedad reportada', date: new Date().toISOString(), resolved: false } : null,
      progress: this.readNumber(record, ['progress', 'progreso', 'porcentaje'], isTerminalShipmentStatus(status) ? 100 : 50),
      nextStop: this.readString(record, ['nextStop', 'proximaParada']) || null,
    };
  }

  private filterShipments(shipments: Shipment[], filters: SearchFilters): Shipment[] {
    const normalizedQuery = filters.query?.trim().toLowerCase() ?? '';

    return shipments.filter((shipment) => {
      const searchableText = [
        shipment.documentNumber,
        shipment.client,
        shipment.origin.country,
        shipment.destination.country,
        shipment.status,
        shipment.operationType,
        shipment.transportMode,
      ]
        .join(' ')
        .toLowerCase();

      return normalizedQuery ? searchableText.includes(normalizedQuery) : true;
    });
  }

  private paginate(shipments: Shipment[], filters: SearchFilters): PaginatedResult<Shipment> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.max(filters.pageSize ?? 10, 1);
    const start = (page - 1) * pageSize;

    return {
      items: shipments.slice(start, start + pageSize),
      page,
      pageSize,
      totalItems: shipments.length,
      totalPages: Math.ceil(shipments.length / pageSize),
    };
  }

  private readArray(record: unknown, keys: string[]): unknown[] {
    const source = this.asRecord(record);

    for (const key of keys) {
      const value = this.getValue(source, [key]);

      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private readString(record: JsonRecord, keys: string[]): string {
    const value = this.getValue(record, keys);

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return '';
  }

  private readNumber(record: JsonRecord, keys: string[], fallback: number): number {
    const value = this.getValue(record, keys);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
  }

  private getValue(record: JsonRecord, keys: string[]): unknown {
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

  private asRecord(value: unknown): JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private toOperationType(value: string): OperationType {
    return /expo|export/i.test(value) ? 'EXPO' : 'IMPO';
  }

  private toTransportMode(value: string): TransportMode {
    return /sea|mar/i.test(value) ? 'SEA' : 'AIR';
  }

  private toShipmentStatus(value: string): ShipmentStatus {
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

    if (/BODEGA.*DEST|DESTINATION_WAREHOUSE/.test(normalized)) {
      return 'DESTINATION_WAREHOUSE';
    }

    if (/BODEGA.*ORIG|ORIGIN_WAREHOUSE/.test(normalized)) {
      return 'ORIGIN_WAREHOUSE';
    }

    if (/NACIONAL|NATIONALIZED/.test(normalized)) {
      return 'NATIONALIZED';
    }

    if (/DESPACH|DISPATCHED/.test(normalized)) {
      return 'DISPATCHED';
    }

    if (/CANCEL/.test(normalized)) {
      return 'CANCELLED';
    }

    if (/PEND/.test(normalized)) {
      return 'PENDING';
    }

    return 'IN_TRANSIT';
  }

  private countOperation(shipments: Shipment[], operationType: OperationType): number {
    return shipments.filter((shipment) => shipment.operationType === operationType).length;
  }

  private countMode(shipments: Shipment[], transportMode: TransportMode): number {
    return shipments.filter((shipment) => shipment.transportMode === transportMode).length;
  }

  private countStatus(shipments: Shipment[], status: ShipmentStatus): number {
    return shipments.filter((shipment) => shipment.status === status).length;
  }

  private countStatuses(shipments: Shipment[], metrics: DashboardMetrics): Record<ShipmentStatus, number> {
    const byStatus = shipments.reduce(
      (result, shipment) => ({
        ...result,
        [shipment.status]: result[shipment.status] + 1,
      }),
      { ...emptyStatusTotals },
    );

    return {
      ...byStatus,
      DELIVERED: Math.max(byStatus.DELIVERED, metrics.totalDelivered),
      WITH_ISSUE: Math.max(byStatus.WITH_ISSUE, metrics.totalWithIssue),
      PENDING: Math.max(byStatus.PENDING, metrics.totalPending),
    };
  }

  private getTopClients(shipments: Shipment[]): { client: string; total: number }[] {
    const totals = shipments.reduce<Record<string, number>>((result, shipment) => {
      result[shipment.client] = (result[shipment.client] ?? 0) + 1;
      return result;
    }, {});

    return Object.entries(totals)
      .map(([client, total]) => ({ client, total }))
      .sort((first, second) => second.total - first.total || first.client.localeCompare(second.client))
      .slice(0, 5);
  }
}
