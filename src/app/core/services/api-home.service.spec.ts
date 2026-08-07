import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiHomeService } from './api-home.service';

describe('ApiHomeService', () => {
  let service: ApiHomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiHomeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: {
            user$: of({
              auth0UserId: 'auth0|123',
              email: 'edison@example.com',
              document: '8110357412',
              roles: ['CLIENT'],
            }),
          },
        },
      ],
    });

    service = TestBed.inject(ApiHomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request home totals with Auth0 document and role', () => {
    service.getDashboardMetrics().subscribe((metrics) => {
      expect(metrics.totalShipments).toBe(105);
      expect(metrics.totalImports).toBe(51);
      expect(metrics.totalExports).toBe(54);
      expect(metrics.totalAir).toBe(52);
      expect(metrics.totalSea).toBe(53);
      expect(metrics.totalWithIssue).toBe(19);
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/totals`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8110357412');
    expect(request.request.params.get('role')).toBe('CLIENT');

    request.flush({
      dataResponse: {
        totalClientRecords: 105,
        totalImports: 51,
        totalExports: 54,
        totalAirShipments: 52,
        totalOceanShipments: 53,
        totalWithIssues: 19,
        enviosRecientes: [
          {
            id: '1',
            nroDocumento: 'AWB-001',
            tipoOperacion: 'IMPO',
            shipmentMode: 'AIR',
            estado: 'En transito',
            origen: 'Mexico',
            destino: 'Colombia',
          },
          {
            id: '2',
            nroDocumento: 'HBL-002',
            tipoOperacion: 'EXPO',
            shipmentMode: 'SEA',
            estado: 'Con novedad',
            origen: 'Colombia',
            destino: 'Espana',
          },
        ],
      },
    });
  });

  it('should expose recent shipments mapped to the frontend model', () => {
    service.getRecent(1).subscribe((shipments) => {
      expect(shipments.length).toBe(1);
      expect(shipments[0].documentNumber).toBe('HBL-010');
      expect(shipments[0].operationType).toBe('EXPO');
      expect(shipments[0].transportMode).toBe('SEA');
      expect(shipments[0].status).toBe('DELIVERED');
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/totals`);

    request.flush({
      dataResponse: {
        totalRegistros: 1,
        enviosRecientes: [
          {
            id: 10,
            nroDocumento: 'HBL-010',
            tipoOperacion: 'Exportacion',
            shipmentMode: 'SEA',
            estado: 'Entregado',
            origen: 'Colombia',
            destino: 'Alemania',
          },
        ],
      },
    });
  });

  it('should request home filters with document value and map one result', () => {
    service.search({ query: '9YJB1QX6', page: 1, pageSize: 30 }).subscribe((result) => {
      expect(result.totalItems).toBe(1);
      expect(result.items[0].id).toBe('157');
      expect(result.items[0].documentNumber).toBe('9YJB1QX6');
      expect(result.items[0].transportMode).toBe('SEA');
      expect(result.items[0].origin.country).toBe('Colombia');
      expect(result.items[0].destination.country).toBe('Mexico');
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/filters`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8110357412');
    expect(request.request.params.get('role')).toBe('CLIENT');
    expect(request.request.params.get('filterValue')).toBe('9YJB1QX6');

    request.flush({
      dataResponse: {
        id: 157,
        nrDocumento: '9YJB1QX6',
        origen: 'Colombia',
        destino: 'Mexico',
        estado: 'En transito',
        tipoOperacion: 'IMPO',
        shipmentMode: 'SEA',
      },
    });
  });

  it('should treat empty filter payload as no results', () => {
    service.search({ query: 'SIN-DATO', page: 1, pageSize: 30 }).subscribe((result) => {
      expect(result.totalItems).toBe(0);
      expect(result.items).toEqual([]);
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/filters`);
    expect(request.request.params.get('role')).toBe('CLIENT');

    request.flush({
      dataResponse: {
        id: 0,
        nrDocumento: '',
        origen: '',
        destino: '',
        estado: '',
        tipoOperacion: '',
        modalidad: '',
      },
    });
  });
});
