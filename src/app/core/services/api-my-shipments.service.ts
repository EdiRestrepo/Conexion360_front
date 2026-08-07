import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResult, SearchFilters } from '../models/common.model';
import { OperationType, Shipment, ShipmentStatus, TransportMode } from '../models/shipment.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

type JsonRecord = Record<string, unknown>;

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

@Injectable({
  providedIn: 'root',
})
export class ApiMyShipmentsService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly shipmentsUrl = `${environment.api.baseUrl}/myshipments/allshipments`;

  search(filters: SearchFilters): Observable<MyShipmentsPage> {
    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.shipmentsUrl, {
          params: this.createParams(identity, filters),
        }),
      ),
      map((response) => this.toMyShipmentsPage(response, filters)),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }

  private createParams(identity: Auth0Identity, filters: SearchFilters): HttpParams {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.max(filters.pageSize ?? 10, 1);

    return new HttpParams()
      .set('idClient', identity.document ?? '')
      .set('role', identity.roles[0] ?? '')
      .set('page', String(page))
      .set('size', String(pageSize));
  }

  private toMyShipmentsPage(response: unknown, filters: SearchFilters): MyShipmentsPage {
    const root = this.asRecord(response);
    const payload = this.firstPayloadItem(this.getValue(root, ['dataResponse', 'DataResponse']) ?? root);
    const meta = this.asRecord(this.getValue(root, ['meta', 'Meta']));
    const payloadRecord = this.asRecord(payload);
    const shipments = this.readArray(payloadRecord, ['myShipments', 'shipments', 'envios', 'data']).map((item) => this.toShipment(item));
    const pageSize = this.readNumber(meta, ['limit', 'size', 'pageSize'], filters.pageSize ?? 10);
    const page = this.readNumber(meta, ['currentPage', 'page'], filters.page ?? 1);
    const totalItems = this.readNumber(
      meta,
      ['totalItems', 'totalRecords'],
      this.readNumber(payloadRecord, ['totalClientRecords', 'totalShipments'], shipments.length),
    );

    return {
      items: shipments,
      page,
      pageSize,
      totalItems,
      totalPages: this.readNumber(meta, ['totalPages'], Math.max(Math.ceil(totalItems / pageSize), 1)),
      summary: {
        total: this.readNumber(payloadRecord, ['totalClientRecords', 'totalShipments'], totalItems),
        imports: this.readNumber(payloadRecord, ['totalImports'], 0),
        exports: this.readNumber(payloadRecord, ['totalExports'], 0),
        air: this.readNumber(payloadRecord, ['totalAirShipments', 'totalAir'], 0),
        sea: this.readNumber(payloadRecord, ['totalOceanShipments', 'totalSea'], 0),
        withIssues: this.readNumber(payloadRecord, ['totalWithIssues', 'totalWithIssue'], 0),
      },
    };
  }

  private toShipment(value: unknown): Shipment {
    const record = this.asRecord(value);
    const documentNumber = this.readString(record, ['documentNumber', 'nrDocumento', 'numeroDocumento']);
    const id = this.readString(record, ['id', 'shipmentId', 'idShipment']) || documentNumber;

    return {
      id,
      documentNumber,
      operationType: this.toOperationType(this.readString(record, ['operationType', 'operation'])),
      transportMode: this.toTransportMode(this.readString(record, ['shipmentMode', 'transportMode', 'mode'])),
      status: this.toShipmentStatus(this.readString(record, ['state', 'status', 'estado'])),
      client: this.readString(record, ['clientName', 'client', 'cliente']),
      provider: '',
      incoterm: '',
      origin: {
        country: this.readString(record, ['origin', 'originCountry', 'paisOrigen']),
        city: null,
        terminal: null,
      },
      destination: {
        country: this.readString(record, ['destination', 'destinationCountry', 'paisDestino']),
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
        etd: this.toDateValue(this.readString(record, ['etdDate', 'etd'])),
        atd: this.toDateValue(this.readString(record, ['atdDate', 'atd'])),
        eta: this.toDateValue(this.readString(record, ['etaDate', 'eta'])),
        ata: this.toDateValue(this.readString(record, ['ataDate', 'ata'])),
      },
      financialInfo: { advancePayment: null, invoice: null },
      documents: [],
      events: [],
      issue: null,
      progress: 0,
      nextStop: null,
    };
  }

  private firstPayloadItem(value: unknown): unknown {
    return Array.isArray(value) ? value[0] ?? {} : value;
  }

  private readArray(record: JsonRecord, keys: string[]): unknown[] {
    for (const key of keys) {
      const value = this.getValue(record, [key]);

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

  private toDateValue(value: string): string | null {
    if (!value || value.startsWith('0001-01-01')) {
      return null;
    }

    return value.split('T')[0] || null;
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

    if (/PEND/.test(normalized)) {
      return 'PENDING';
    }

    return 'IN_TRANSIT';
  }
}
