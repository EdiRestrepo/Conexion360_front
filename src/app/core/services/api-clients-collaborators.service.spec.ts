import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { MasterOperationResult } from '../models/clients-collaborators.model';
import { ApiClientsCollaboratorsService } from './api-clients-collaborators.service';

describe('ApiClientsCollaboratorsService', () => {
  let service: ApiClientsCollaboratorsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiClientsCollaboratorsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiClientsCollaboratorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a customer with the document as clientId', () => {
    let result: MasterOperationResult | undefined;

    service.createCustomer('123456789').subscribe((value) => (result = value));

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/createcustomerdb?clientId=123456789`);

    expect(request.request.method).toBe('GET');
    request.flush({ message: 'Cliente registrado' });

    expect(result).toEqual({ message: 'Cliente registrado' });
  });

  it('should create a collaborator reusing the clientId parameter name', () => {
    service.createCollaborator('1234567890').subscribe();

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/createcollaboratordb?clientId=1234567890`);

    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should link a customer to a collaborator with both documents', () => {
    service.linkCustomerToCollaborator('123456789', '1234567890').subscribe();

    const request = httpMock.expectOne(
      `${environment.api.baseUrl}/settings/createcustomercollaboratordb?clientId=123456789&collaborator=1234567890`,
    );

    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should leave the message empty when the backend does not send one', () => {
    let result: MasterOperationResult | undefined;

    service.createCustomer('123456789').subscribe((value) => (result = value));
    httpMock.expectOne(`${environment.api.baseUrl}/settings/createcustomerdb?clientId=123456789`).flush({});

    expect(result).toEqual({ message: '' });
  });
});
