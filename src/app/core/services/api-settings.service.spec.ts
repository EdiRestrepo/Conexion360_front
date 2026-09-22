import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MasterSettings } from '../models/settings.model';
import {
  NotificationSettings,
  UserNotificationPreferences,
  defaultNotificationPreferences,
} from '../models/notification.model';
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
    let settings: NotificationSettings | undefined;

    service.getNotificationSettings().subscribe((value) => (settings = value));

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`);

    expect(request.request.method).toBe('GET');
    request.flush({
      dataResponse: {
        notificationChannels: { notificationChannelId: 7, application: true, email: false, textMessages: true },
        notificationEvents: {
          notificationEventId: 9,
          changeState: false,
          successfulDelivery: true,
          withIssues: false,
          shipmentTransit: true,
          deliveryReminder: true,
        },
      },
    });

    expect(settings).toEqual({
      channelId: 7,
      eventId: 9,
      preferences: {
        inApp: true,
        email: false,
        sms: true,
        shipmentStatusChanges: false,
        delivery: true,
        delays: false,
        shipmentEnRoute: true,
        deliveryReminders: true,
      },
    });
  });

  it('should fall back to the default preference when the backend omits a field', () => {
    let settings: NotificationSettings | undefined;

    service.getNotificationSettings().subscribe((value) => (settings = value));
    httpMock
      .expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`)
      .flush({ dataResponse: { notificationChannels: { application: false } } });

    expect(settings?.preferences.inApp).toBeFalse();
    // No viene en la respuesta: se mantiene el valor por defecto, no `false`.
    expect(settings?.preferences.email).toBeTrue();
    expect(settings?.preferences.shipmentStatusChanges).toBeTrue();
    // Sin ids, el cliente todavia no tiene configuracion guardada.
    expect(settings?.channelId).toBe(0);
    expect(settings?.eventId).toBe(0);
  });

  it('should treat a 404 as a client without notification settings', () => {
    let settings: NotificationSettings | undefined;
    let failure: unknown;

    service.getNotificationSettings().subscribe({
      next: (value) => (settings = value),
      error: (error: unknown) => (failure = error),
    });
    httpMock
      .expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(failure).toBeUndefined();
    expect(settings).toEqual({ channelId: 0, eventId: 0, preferences: defaultNotificationPreferences });
  });

  it('should propagate a failure that is not a 404', () => {
    let failure: unknown;

    service.getNotificationSettings().subscribe({ error: (error: unknown) => (failure = error) });
    httpMock
      .expectOne(`${environment.api.baseUrl}/settings/viewnotifications?idClient=8110357412`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(failure).toBeDefined();
  });

  it('should create the notification settings when the client has no ids yet', () => {
    service.saveNotificationSettings(createPreferences(), { channelId: 0, eventId: 0 }).subscribe();

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/createnotifications`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      notificationChannels: {
        clientId: '8110357412',
        notificationChannelId: 0,
        application: true,
        email: true,
        textMessages: false,
      },
      notificationEvents: {
        clientId: '8110357412',
        notificationEventId: 0,
        changeState: true,
        successfulDelivery: true,
        withIssues: true,
        shipmentTransit: false,
        deliveryReminder: false,
      },
    });

    request.flush(null);
  });

  it('should update the notification settings when the client already has ids', () => {
    service.saveNotificationSettings({ ...createPreferences(), sms: true }, { channelId: 7, eventId: 9 }).subscribe();

    const request = httpMock.expectOne(`${environment.api.baseUrl}/settings/updatenotifications`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.notificationChannels).toEqual({
      clientId: '8110357412',
      notificationChannelId: 7,
      application: true,
      email: true,
      textMessages: true,
    });
    expect(request.request.body.notificationEvents.notificationEventId).toBe(9);

    request.flush(null);
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

function createPreferences(): UserNotificationPreferences {
  return {
    email: true,
    inApp: true,
    sms: false,
    shipmentStatusChanges: true,
    delivery: true,
    delays: true,
    shipmentEnRoute: false,
    deliveryReminders: false,
  };
}
