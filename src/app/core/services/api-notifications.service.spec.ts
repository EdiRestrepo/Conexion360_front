import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { ApiNotificationsService } from './api-notifications.service';

describe('ApiNotificationsService', () => {
  let service: ApiNotificationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiNotificationsService,
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

    service = TestBed.inject(ApiNotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request notifications with the Auth0 document as idClient', () => {
    let notifications: Notification[] = [];

    service.getAll().subscribe((value) => (notifications = value));

    const request = expectRequest();

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8110357412');

    request.flush({ dataResponse: [createBackendNotification()] });

    expect(notifications.length).toBe(1);
    expect(notifications[0]).toEqual({
      id: '1',
      type: 'STATUS_CHANGE',
      shipmentDocument: 'HBL-5U6HC36K',
      title: 'Cambio de estado a pendiente.',
      description: 'Se registra el envío en el sistema, queda pendiente de procesamiento.',
      createdAt: '2026-08-17T21:54:08.7158512-05:00',
      eventDate: '2026-08-14T21:54:08.7153611-05:00',
      read: true,
    });
  });

  it('should map the notificationType and notificationStatus enums', () => {
    let notifications: Notification[] = [];

    service.getAll().subscribe((value) => (notifications = value));
    expectRequest().flush({
      dataResponse: [
        { ...createBackendNotification(), idNotification: 1, notificationType: 0, notificationStatus: 0 },
        { ...createBackendNotification(), idNotification: 2, notificationType: 1, notificationStatus: 1 },
        // Un código fuera del enum no debe romper la lista.
        { ...createBackendNotification(), idNotification: 3, notificationType: 99, notificationStatus: 0 },
      ],
    });

    expect(notifications.map((item) => item.type)).toEqual(['STATUS_CHANGE', 'COMMENT', 'STATUS_CHANGE']);
    expect(notifications.map((item) => item.read)).toEqual([false, true, false]);
  });

  it('should count unread notifications without a second request', () => {
    let unreadCount = -1;
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    service.getUnreadCount().subscribe((value) => (unreadCount = value));

    expectRequest().flush({
      dataResponse: [
        { ...createBackendNotification(), idNotification: 1, notificationStatus: 0 },
        { ...createBackendNotification(), idNotification: 2, notificationStatus: 0 },
        { ...createBackendNotification(), idNotification: 3, notificationStatus: 1 },
      ],
    });

    expect(listed.length).toBe(3);
    expect(unreadCount).toBe(2);
    httpMock.expectNone(() => true);
  });

  it('should drop the unread count when a notification is marked as read', () => {
    let unreadCount = -1;

    service.getAll().subscribe();
    service.getUnreadCount().subscribe((value) => (unreadCount = value));
    expectRequest().flush({
      dataResponse: [
        { ...createBackendNotification(), idNotification: 1, notificationStatus: 0 },
        { ...createBackendNotification(), idNotification: 2, notificationStatus: 0 },
      ],
    });

    expect(unreadCount).toBe(2);

    service.markAsRead('1').subscribe((notification) => expect(notification?.read).toBeTrue());

    expect(unreadCount).toBe(1);
    // Todavía no hay endpoint que persista el cambio.
    httpMock.expectNone(() => true);
  });

  it('should ignore marking an unknown or already read notification', () => {
    service.getAll().subscribe();
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 1 }] });

    service.markAsRead('1').subscribe((notification) => expect(notification?.read).toBeTrue());
    service.markAsRead('does-not-exist').subscribe((notification) => expect(notification).toBeNull());
  });

  it('should go back to the backend after reload', () => {
    service.getAll().subscribe();
    expectRequest().flush({ dataResponse: [createBackendNotification()] });

    service.getAll().subscribe();
    httpMock.expectNone(() => true);

    service.reload();
    let notifications: Notification[] = [];
    service.getAll().subscribe((value) => (notifications = value));
    expectRequest().flush({ dataResponse: [] });

    expect(notifications).toEqual([]);
  });

  it('should retry the request after a failure', () => {
    let failed = false;

    service.getAll().subscribe({ error: () => (failed = true) });
    expectRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(failed).toBeTrue();

    let notifications: Notification[] = [];
    service.getAll().subscribe((value) => (notifications = value));
    expectRequest().flush({ dataResponse: [createBackendNotification()] });

    expect(notifications.length).toBe(1);
  });

  function expectRequest() {
    return httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/notifications/allnotifications`);
  }

  function createBackendNotification(): Record<string, unknown> {
    return {
      idNotification: 1,
      notificationType: 0,
      documentNumber: 'HBL-5U6HC36K',
      title: 'Cambio de estado a pendiente.',
      message: 'Se registra el envío en el sistema, queda pendiente de procesamiento.',
      messageDate: '2026-08-14T21:54:08.7153611-05:00',
      notificationStatus: 1,
      notificationDate: '2026-08-17T21:54:08.7158512-05:00',
    };
  }
});
