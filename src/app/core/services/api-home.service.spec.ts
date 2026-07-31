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
});
