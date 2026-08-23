import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { mockTopClients } from '../../mocks/data/mock-top-clients';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiReportsService } from './api-reports.service';

describe('ApiReportsService', () => {
  let service: ApiReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiReportsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: {
            user$: of({
              auth0UserId: 'auth0|123',
              email: 'edison@example.com',
              document: '890903474',
              roles: ['CLIENT'],
            }),
          },
        },
      ],
    });

    service = TestBed.inject(ApiReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request report totals with the Auth0 document as idClient', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.totalShipments).toBe(128);
      expect(metrics.totalDelivered).toBe(26);
      expect(metrics.totalWithIssue).toBe(18);
      expect(metrics.totalPending).toBe(17);
      expect(metrics.totalActive).toBe(84);
      expect(metrics.totalBilledUsd).toBeCloseTo(691049.62, 2);
      expect(metrics.totalAdvancesUsd).toBe(323552.49);
      expect(metrics.totalDelayUsd).toBe(8802);
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('890903474');
    expect(request.request.params.has('role')).toBe(false);

    request.flush({ dataResponse: createDataResponse() });
  });

  it('should group totals by operation, mode and status', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.byOperationType).toEqual({ IMPO: 57, EXPO: 71 });
      expect(metrics.byTransportMode).toEqual({ AIR: 65, SEA: 63 });
      // El orden importa: Reportes pinta "Por estado" recorriendo estas claves.
      expect(Object.keys(metrics.byStatus)).toEqual([
        'PENDING',
        'ORIGIN_CUSTOMS',
        'IN_TRANSIT',
        'DESTINATION_CUSTOMS',
        'DELIVERED',
        'WITH_ISSUE',
      ]);
      expect(metrics.byStatus.ORIGIN_CUSTOMS).toBe(18);
      expect(metrics.byStatus.IN_TRANSIT).toBe(21);
      expect(metrics.byStatus.DESTINATION_CUSTOMS).toBe(28);
    });

    httpMock
      .expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`)
      .flush({ dataResponse: createDataResponse() });
  });

  it('should build frequent routes sorted by total', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.topRoutes).toEqual([
        { route: 'Chile → Colombia', total: 21 },
        { route: 'Colombia → Brasil', total: 14 },
      ]);
    });

    httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`).flush({
      dataResponse: {
        ...createDataResponse(),
        frequentRoutes: [
          { origin: 'Colombia', destination: 'Brasil', totalRoute: 14 },
          { origin: 'Chile', destination: 'Colombia', totalRoute: 21 },
        ],
      },
    });
  });

  // Provisional: el endpoint no manda ranking de clientes todavía.
  it('should fall back to the mocked client ranking', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.topClients).toEqual(mockTopClients);
      expect(metrics.topClients.length).toBeGreaterThan(0);
    });

    httpMock
      .expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`)
      .flush({ dataResponse: createDataResponse() });
  });

  it('should keep the client ranking sent by the backend when it exists', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.topClients).toEqual([{ client: 'Postobon', total: 9 }]);
    });

    httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`).flush({
      dataResponse: { ...createDataResponse(), topClients: [{ client: 'Postobon', total: 9 }] },
    });
  });

  it('should return zeroed metrics when the payload is empty', () => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.totalShipments).toBe(0);
      expect(metrics.totalActive).toBe(0);
      expect(metrics.topRoutes).toEqual([]);
    });

    httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/reports/home`).flush({ dataResponse: null });
  });

  function createDataResponse(): Record<string, unknown> {
    return {
      totalClientRecords: 128,
      totalWithIssuesStatus: 18,
      totalDeliveredStatus: 26,
      totalDestinationCustomsStatus: 28,
      totalOriginCustomsStatus: 18,
      totalInTransitStatus: 21,
      totalPendingStatus: 17,
      totalInvoiced: 691049.6199999996,
      totalAdvancePayment: 323552.49,
      totalDelays: 8802,
      totalImports: 57,
      totalExports: 71,
      totalAirShipments: 65,
      totalOceanShipments: 63,
      frequentRoutes: [{ origin: 'Colombia', destination: 'Brasil', totalRoute: 14 }],
    };
  }
});
