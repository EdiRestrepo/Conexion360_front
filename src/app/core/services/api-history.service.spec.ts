import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiHistoryService } from './api-history.service';

describe('ApiHistoryService', () => {
  let service: ApiHistoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiHistoryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: {
            user$: of({
              auth0UserId: 'auth0|123',
              email: 'edison@example.com',
              document: '8909006089',
              roles: ['CLIENT'],
            }),
          },
        },
      ],
    });

    service = TestBed.inject(ApiHistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request history shipments with Auth0 document and pagination', () => {
    service.search({ page: 1, pageSize: 10 }).subscribe((result) => {
      expect(result.totalItems).toBe(107);
      expect(result.totalPages).toBe(6);
      expect(result.summary.total).toBe(107);
      expect(result.summary.air).toBe(52);
      expect(result.summary.sea).toBe(55);
      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe('2');
      expect(result.items[0].documentNumber).toBe('AWB-F1T2TALA');
      expect(result.items[0].transportMode).toBe('AIR');
      expect(result.items[0].status).toBe('ORIGIN_CUSTOMS');
      expect(result.items[0].logisticDates.etd).toBeNull();
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/myshipments/allhistory`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8909006089');
    expect(request.request.params.has('role')).toBe(false);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');

    request.flush({
      dataResponse: [
        {
          totalClientRecords: 107,
          totalImports: 0,
          totalExports: 61,
          totalAirShipments: 52,
          totalOceanShipments: 55,
          totalWithIssues: 0,
          myShipments: [
            {
              id: 2,
              shipmentMode: 'AIR',
              documentNumber: 'AWB-F1T2TALA',
              state: 'En Aduana origen',
              operationType: 'EXPO',
              clientName: 'Almacenes Éxito',
              origin: 'Colombia',
              destination: 'Brasil',
              etdDate: '0001-01-01T00:00:00',
              atdDate: '0001-01-01T00:00:00',
              etaDate: '0001-01-01T00:00:00',
              ataDate: '0001-01-01T00:00:00',
            },
          ],
        },
      ],
      meta: {
        totalItems: 107,
        totalPages: 6,
        currentPage: 1,
        limit: 10,
      },
    });
  });

  it('should request filtered history with optional filter params and no state param', () => {
    service.search({ query: 'China', operationType: 'EXPO', transportMode: 'AIR', page: 1, pageSize: 10 }).subscribe((result) => {
      expect(result.totalItems).toBe(1);
      expect(result.items[0].documentNumber).toBe('AWB-FILTER-001');
      expect(result.items[0].status).toBe('DELIVERED');
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/myshipments/filterhistory`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8909006089');
    expect(request.request.params.has('role')).toBe(false);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('ValueFilter')).toBe('China');
    expect(request.request.params.get('OperationType')).toBe('EXPO');
    expect(request.request.params.get('ShipmentMode')).toBe('AIR');
    expect(request.request.params.has('State')).toBe(false);

    request.flush({
      dataResponse: [
        {
          totalClientRecords: 1,
          totalImports: 0,
          totalExports: 1,
          totalAirShipments: 1,
          totalOceanShipments: 0,
          totalWithIssues: 0,
          myShipments: [
            {
              id: 8,
              shipmentMode: 'AIR',
              documentNumber: 'AWB-FILTER-001',
              state: 'Entregado',
              operationType: 'EXPO',
              clientName: 'Zenu',
              origin: 'Colombia',
              destination: 'China',
              etdDate: '2026-01-01T00:00:00',
              atdDate: '2026-01-02T00:00:00',
              etaDate: '2026-01-10T00:00:00',
              ataDate: '2026-01-10T00:00:00',
            },
          ],
        },
      ],
      meta: {
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      },
    });
  });

  it('should use the plain history endpoint when no filters are provided', () => {
    service.search({ page: 1, pageSize: 10 }).subscribe();

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/myshipments/allhistory`);
    expect(request.request.url).toBe(`${environment.api.baseUrl}/myshipments/allhistory`);

    request.flush({
      dataResponse: [{ myShipments: [] }],
      meta: { totalItems: 0, totalPages: 1, currentPage: 1, limit: 10 },
    });

    httpMock.expectNone((item) => item.url === `${environment.api.baseUrl}/myshipments/filterhistory`);
  });
});
