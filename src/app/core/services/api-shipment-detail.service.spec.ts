import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiShipmentDetailService } from './api-shipment-detail.service';

describe('ApiShipmentDetailService', () => {
  let service: ApiShipmentDetailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: { user$: of({ document: '8110357412' }) },
        },
      ],
    });

    service = TestBed.inject(ApiShipmentDetailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should request the detail with the client document and the transport document', () => {
    service.getDetail('HBL-XA5S00I8', 'shipment-1').subscribe((shipment) => {
      expect(shipment?.documentNumber).toBe('HBL-XA5S00I8');
      expect(shipment?.id).toBe('shipment-1');
    });

    const request = httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/myshipments/detailsshipments`);

    expect(request.request.params.get('idClient')).toBe('8110357412');
    expect(request.request.params.get('documentNumber')).toBe('HBL-XA5S00I8');

    request.flush({
      dataResponse: {
        resumenShipments: { documentNumber: 'HBL-XA5S00I8', shipmentMode: 'SEA', operationType: 'IMPO' },
        trackingShipments: { state: 'En tránsito' },
      },
    });
  });

  it('should not call the backend without a transport document', () => {
    service.getDetail('  ').subscribe((shipment) => expect(shipment).toBeNull());

    httpMock.expectNone(() => true);
  });
});
