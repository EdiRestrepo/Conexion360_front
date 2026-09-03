import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MasterSettings } from '../models/settings.model';
import { UserNotificationPreferences } from '../models/notification.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiSettingsService } from './api-settings.service';

describe('ApiSettingsService', () => {
  let service: ApiSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiSettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: {
            user$: of({ auth0UserId: 'auth0|123', email: 'edison@example.com', document: '8110357412', roles: ['ADMIN'] }),
          },
        },
      ],
    });

    service = TestBed.inject(ApiSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map the notification settings with the Auth0 document as idClient', () => {
    let preferences: UserNotificationPreferences | undefined;

    service.getNotificationSettings().subscribe((value) => (preferences = value));

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`);

    expect(request.request.method).toBe('GET');
    request.flush({
      dataResponse: {
        notificationChannels: { application: true, email: false, textMessages: true },
        notificationEvents: {
          changeState: false,
          successfulDelivery: true,
          withIssues: false,
          shipmentTransit: true,
          deliveryReminder: true,
        },
      },
    });

    expect(preferences).toEqual({
      inApp: true,
      email: false,
      sms: true,
      shipmentStatusChanges: false,
      delivery: true,
      delays: false,
      shipmentEnRoute: true,
      deliveryReminders: true,
    });
  });

  it('should fall back to the default preference when the backend omits a field', () => {
    let preferences: UserNotificationPreferences | undefined;

    service.getNotificationSettings().subscribe((value) => (preferences = value));
    httpMock
      .expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`)
      .flush({ dataResponse: { notificationChannels: { application: false } } });

    expect(preferences?.inApp).toBeFalse();
    // No viene en la respuesta: se mantiene el valor por defecto, no `false`.
    expect(preferences?.email).toBeTrue();
    expect(preferences?.shipmentStatusChanges).toBeTrue();
  });

  it('should flatten the master settings groups', () => {
    let settings: MasterSettings | undefined;

    service.getMasterSettings().subscribe((value) => (settings = value));

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/viewmaster?idClient=8110357412`);

    expect(request.request.method).toBe('GET');
    request.flush({
      dataResponse: {
        generalParameters: { automaticTrackingUpdate: true, requireDocumentUpload: false, publicMonitoring: true },
        location: { currencyType: 'USD - Dólar', language: 'Español' },
        system: { timeZone: 'America/Bogota(UTC-5)', dataRetentionDays: 365 },
      },
    });

    expect(settings).toEqual({
      automaticTrackingUpdate: true,
      requireDocumentUpload: false,
      publicMonitoring: true,
      currency: 'USD - Dólar',
      language: 'Español',
      timeZone: 'America/Bogota(UTC-5)',
      dataRetentionDays: 365,
    });
  });
});
