import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, of, shareReplay, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResult, SearchFilters } from '../models/common.model';
import { Auth0Identity } from '../models/user.model';
import {
  DashboardMetrics,
  OperationType,
  ShipmentStatus,
  TransportMode,
} from '../models/shipment.model';
import { Auth0FacadeService } from './auth0-facade.service';

type JsonRecord = Record<string, unknown>;

export interface HomeShipmentSummary {
  id: string;
  documentNumber: string;
  operationType: OperationType;
  transportMode: TransportMode;
  status: ShipmentStatus;
  origin: {
    country: string;
  };
  destination: {
    country: string;
  };
}

interface HomeDashboardData {
  metrics: DashboardMetrics;
  recentShipments: HomeShipmentSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiHomeService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly homeUrl = `${environment.api.baseUrl}/home/totals`;
  private readonly filtersUrl = `${environment.api.baseUrl}/home/filters`;
  private readonly dashboardData$ = this.getIdentity().pipe(
    switchMap((identity) =>
      this.http.get<unknown>(this.homeUrl, {
        params: this.createHomeParams(identity),
      }),
    ),
      map((response) => this.toHomeDashboardData(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.dashboardData$.pipe(map((data) => data.metrics));
  }

  getRecent(limit?: number): Observable<HomeShipmentSummary[]> {
    return this.dashboardData$.pipe(map((data) => (limit === undefined ? data.recentShipments : data.recentShipments.slice(0, Math.max(limit, 0)))));
  }

  search(filters: SearchFilters): Observable<PaginatedResult<HomeShipmentSummary>> {
    const filterValue = filters.query?.trim() ?? '';

    if (!filterValue) {
      return of(this.paginate([], filters));
    }

    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.filtersUrl, {
          params: this.createHomeParams(identity).set('filterValue', filterValue),
        }),
      ),
      map((response) => this.paginate(this.toHomeFilterResults(response), filters)),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }

  private createHomeParams(identity: Auth0Identity): HttpParams {
    return new HttpParams().set('idClient', identity.document ?? '');
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
    ])
      .map((item) => this.toShipment(item))
      .filter((shipment) => this.hasSearchResultData(shipment));
    const metrics = this.toDashboardMetrics(payload);

    return {
      metrics,
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

  private toDashboardMetrics(payload: unknown): DashboardMetrics {
    const record = this.asRecord(payload);
    const totalShipments = this.readNumber(record, ['totalShipments', 'totalClientRecords', 'totalEnvios', 'totalRegistros', 'total', 'cantidadTotal'], 0);
    const totalImports = this.readNumber(record, ['totalImports', 'totalImportaciones', 'importaciones', 'totalImpo'], 0);
    const totalExports = this.readNumber(record, ['totalExports', 'totalExportaciones', 'exportaciones', 'totalExpo'], 0);
    const totalAir = this.readNumber(record, ['totalAir', 'totalAirShipments', 'totalAereos', 'aereos', 'totalModalidadAerea'], 0);
    const totalSea = this.readNumber(record, ['totalSea', 'totalOceanShipments', 'totalMaritimos', 'maritimos', 'totalModalidadMaritima'], 0);
    const totalDelivered = this.readNumber(record, ['totalDelivered', 'totalEntregados', 'entregados'], 0);
    const totalWithIssue = this.readNumber(record, ['totalWithIssue', 'totalWithIssues', 'totalConNovedad', 'conNovedad', 'novedades'], 0);
    const totalActive = this.readNumber(
      record,
      ['totalActive', 'totalActivos', 'activos'],
      0,
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
      totalPending: this.readNumber(record, ['totalPending', 'totalPendientes', 'pendientes'], 0),
    };
  }

  private toHomeFilterResults(response: unknown): HomeShipmentSummary[] {
    const payload = this.unwrapPayload(response);
    const items = Array.isArray(payload) ? payload : [payload];

    return items
      .map((item) => this.toShipment(item))
      .filter((shipment) => this.hasSearchResultData(shipment));
  }

  private toShipment(value: unknown): HomeShipmentSummary {
    const record = this.asRecord(value);
    const operationType = this.toOperationType(this.readString(record, ['operationType', 'tipoOperacion', 'operacion', 'operation']));
    const transportMode = this.toTransportMode(this.readString(record, ['transportMode', 'shipmentMode', 'modalidad', 'modalidadTransporte', 'mode']));
    const status = this.toShipmentStatus(this.readString(record, ['status', 'estado', 'estadoLogistico']));
    const documentNumber =
      this.readString(record, [
        'documentNumber',
        'documentoTransporte',
        'numeroDocumento',
        'nroDocumento',
        'nrDocumento',
        'hbl',
        'awb',
        'mbl',
        'guia',
      ]);

    return {
      id: this.readString(record, ['id', 'shipmentId', 'idShipment', 'idEnvio']) || documentNumber,
      documentNumber,
      operationType,
      transportMode,
      status,
      origin: {
        country: this.readString(record, ['originCountry', 'paisOrigen', 'origen', 'origin']),
      },
      destination: {
        country: this.readString(record, ['destinationCountry', 'paisDestino', 'destino', 'destination']),
      },
    };
  }

  private hasSearchResultData(shipment: HomeShipmentSummary): boolean {
    const normalizedId = shipment.id.trim();

    return Boolean(
      shipment.documentNumber ||
        shipment.origin.country ||
        shipment.destination.country ||
        (normalizedId && normalizedId !== '0'),
    );
  }

  private paginate(shipments: HomeShipmentSummary[], filters: SearchFilters): PaginatedResult<HomeShipmentSummary> {
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

    if (/BODEGA.*DEST|DESTINATION_WAREHOUSE|NACIONAL|NATIONALIZED|DESPACH|DISPATCHED/.test(normalized)) {
      return 'DESTINATION_CUSTOMS';
    }

    if (/BODEGA.*ORIG|ORIGIN_WAREHOUSE/.test(normalized)) {
      return 'PENDING';
    }

    if (/CANCEL/.test(normalized)) {
      return 'WITH_ISSUE';
    }

    if (/PEND/.test(normalized)) {
      return 'PENDING';
    }

    return 'IN_TRANSIT';
  }

}
