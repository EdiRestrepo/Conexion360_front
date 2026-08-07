import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiMyShipmentsService } from './api-my-shipments.service';

describe('ApiMyShipmentsService', () => {
  let service: ApiMyShipmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiMyShipmentsService,
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

    service = TestBed.inject(ApiMyShipmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request backend shipments with Auth0 document, role and pagination', () => {
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

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/myshipments/allshipments`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8909006089');
    expect(request.request.params.get('role')).toBe('CLIENT');
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
});
