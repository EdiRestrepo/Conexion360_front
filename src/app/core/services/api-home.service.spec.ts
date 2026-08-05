import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { ApiHomeService } from './api-home.service';

describe('ApiHomeService', () => {
  let service: ApiHomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiHomeService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiHomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request home totals with configured client and role', () => {
    service.getDashboardMetrics().subscribe((metrics) => {
      expect(metrics.totalShipments).toBe(2);
      expect(metrics.totalImports).toBe(1);
      expect(metrics.totalExports).toBe(1);
      expect(metrics.totalAir).toBe(1);
      expect(metrics.totalSea).toBe(1);
      expect(metrics.totalWithIssue).toBe(1);
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/totals`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe(environment.api.homeClientId);
    expect(request.request.params.get('rol')).toBe(environment.api.homeRole);

    request.flush({
      dataResponse: {
        totalRegistros: 2,
        totalImportaciones: 1,
        totalExportaciones: 1,
        totalModalidadAerea: 1,
        totalModalidadMaritima: 1,
        totalConNovedad: 1,
        enviosRecientes: [
          {
            id: '1',
            nroDocumento: 'AWB-001',
            tipoOperacion: 'IMPO',
            modalidad: 'AIR',
            estado: 'En transito',
            origen: 'Mexico',
            destino: 'Colombia',
          },
          {
            id: '2',
            nroDocumento: 'HBL-002',
            tipoOperacion: 'EXPO',
            modalidad: 'SEA',
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
            modalidad: 'SEA',
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
      expect(result.items[0].origin.country).toBe('Colombia');
      expect(result.items[0].destination.country).toBe('Mexico');
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/filters`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe(environment.api.homeClientId);
    expect(request.request.params.get('rol')).toBe(environment.api.homeRole);
    expect(request.request.params.get('filterValue')).toBe('9YJB1QX6');

    request.flush({
      dataResponse: {
        id: 157,
        nrDocumento: '9YJB1QX6',
        origen: 'Colombia',
        destino: 'Mexico',
        estado: 'En transito',
        tipoOperacion: 'IMPO',
        modalidad: 'AIR',
      },
    });
  });

  it('should treat empty filter payload as no results', () => {
    service.search({ query: 'SIN-DATO', page: 1, pageSize: 30 }).subscribe((result) => {
      expect(result.totalItems).toBe(0);
      expect(result.items).toEqual([]);
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/home/filters`);

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
