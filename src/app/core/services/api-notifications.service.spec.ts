import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { NotificationsHubService } from './notifications-hub.service';
import { ApiNotificationsService } from './api-notifications.service';

describe('ApiNotificationsService', () => {
  let service: ApiNotificationsService;
  let httpMock: HttpTestingController;
  let notificationReceived$: Subject<unknown>;
  let connectSpy: jasmine.Spy<(idClient: string) => Promise<void>>;

  beforeEach(() => {
    notificationReceived$ = new Subject<unknown>();
    connectSpy = jasmine.createSpy('connect').and.resolveTo();

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
        {
          provide: NotificationsHubService,
          useValue: { notificationReceived$, connect: connectSpy },
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

    // El contador baja apenas se hace click, sin esperar la respuesta del PATCH.
    expect(unreadCount).toBe(1);
    expectReadRequest('1').flush(null, { status: 204, statusText: 'No Content' });

    expect(unreadCount).toBe(1);
  });

  it('should persist the read state with a PATCH to readnotification', () => {
    service.getAll().subscribe();
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 7, notificationStatus: 0 }] });

    service.markAsRead('7').subscribe();

    const request = expectReadRequest('7');

    expect(request.request.method).toBe('PATCH');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should keep the notification read when the backend rejects the change', () => {
    let listed: Notification[] = [];
    let failed = false;
    let result: Notification | null | undefined;

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 0 }] });

    service.markAsRead('1').subscribe({ next: (value) => (result = value), error: () => (failed = true) });

    expect(listed[0].read).toBeTrue();

    // El endpoint todavía responde 500 y tampoco persiste cuando responde bien:
    // devolver la tarjeta a "no leída" delante del usuario no ayudaría.
    expectReadRequest('1').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(failed).toBeFalse();
    expect(result?.read).toBeTrue();
    expect(listed[0].read).toBeTrue();
  });

  it('should not send the PATCH for a notification pushed by the hub', () => {
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [] });

    notificationReceived$.next([{ message: 'Aviso en vivo', timestamp: '2026-08-24T01:05:00.000Z' }]);
    service.markAsRead(listed[0].id).subscribe();

    // El id lo inventó el mapper; el backend no lo reconocería.
    expect(listed[0].read).toBeTrue();
    httpMock.expectNone(() => true);
  });

  it('should ignore marking an unknown or already read notification', () => {
    service.getAll().subscribe();
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 1 }] });

    service.markAsRead('1').subscribe((notification) => expect(notification?.read).toBeTrue());
    service.markAsRead('does-not-exist').subscribe((notification) => expect(notification).toBeNull());
  });

  it('should subscribe to the hub with the Auth0 document', () => {
    service.getAll().subscribe();
    expectRequest().flush({ dataResponse: [] });

    expect(connectSpy).toHaveBeenCalledWith('8110357412');
  });

  it('should add the pushed notification without querying the inbox again', () => {
    let listed: Notification[] = [];
    let unreadCount = -1;

    service.getAll().subscribe((value) => (listed = value));
    service.getUnreadCount().subscribe((value) => (unreadCount = value));
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 1 }] });

    expect(unreadCount).toBe(0);

    notificationReceived$.next([
      {
        message: 'Se registra el envío en el sistema.',
        data: { ...createBackendNotification(), idNotification: 9, notificationStatus: 0 },
        timestamp: '2026-08-24T01:05:00.000Z',
      },
    ]);

    expect(listed.length).toBe(2);
    expect(listed[0].title).toBe('Cambio de estado a pendiente.');
    expect(listed[0].shipmentDocument).toBe('HBL-5U6HC36K');
    expect(listed[0].read).toBeFalse();
    expect(unreadCount).toBe(1);
    // Lo importante: el push NO dispara `allnotifications`.
    httpMock.expectNone(() => true);
  });

  it('should build a card from the message when the push carries no row', () => {
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [] });

    notificationReceived$.next([
      {
        message: 'Se presenta una novedad documental que retrasa el proceso.',
        data: null,
        timestamp: '2026-08-24T01:05:00.000Z',
      },
    ]);

    expect(listed.length).toBe(1);
    expect(listed[0].description).toBe('Se presenta una novedad documental que retrasa el proceso.');
    expect(listed[0].read).toBeFalse();
    httpMock.expectNone(() => true);
  });

  // Lo que rompía antes: dos avisos sobre la misma fila se tomaban por
  // repetidos y solo entraba el primero.
  it('should add one card per push, even when the payload repeats itself', () => {
    let listed: Notification[] = [];
    const push = [
      {
        message: 'Mensaje',
        data: { ...createBackendNotification(), idNotification: 9, notificationStatus: 0 },
        timestamp: '2026-08-24T01:05:00.000Z',
      },
    ];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [] });

    notificationReceived$.next(push);
    notificationReceived$.next(push);
    notificationReceived$.next(push);

    expect(listed.length).toBe(3);
    expect(new Set(listed.map((item) => item.id)).size).toBe(3);
    httpMock.expectNone(() => true);
  });

  it('should read the row when the hub sends the arguments separately', () => {
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [] });

    // `SendAsync(metodo, mensaje, fila, marcaDeTiempo)`
    notificationReceived$.next([
      'Se registra el envío en el sistema.',
      { ...createBackendNotification(), idNotification: 9, notificationStatus: 0 },
      '2026-08-24T01:05:00.000Z',
    ]);

    expect(listed.length).toBe(1);
    expect(listed[0].title).toBe('Cambio de estado a pendiente.');
    expect(listed[0].shipmentDocument).toBe('HBL-5U6HC36K');
    expect(listed[0].read).toBeFalse();
  });

  it('should show the raw payload when nothing in it is recognizable', () => {
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [] });

    notificationReceived$.next([{ algoInesperado: 42 }]);

    expect(listed.length).toBe(1);
    expect(listed[0].description).toContain('algoInesperado');
  });

  it('should keep the read state while a stale response is in flight', () => {
    let listed: Notification[] = [];

    service.getAll().subscribe((value) => (listed = value));
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 0 }] });

    service.markAsRead('1').subscribe();
    expectReadRequest('1').flush(null, { status: 204, statusText: 'No Content' });

    expect(listed[0].read).toBeTrue();

    service.reload();
    service.getAll().subscribe();
    // Una respuesta que todavía trae el estado anterior no debe revertir lo leído.
    expectRequest().flush({ dataResponse: [{ ...createBackendNotification(), idNotification: 1, notificationStatus: 0 }] });

    expect(listed[0].read).toBeTrue();
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

  function expectReadRequest(idNotification: string) {
    return httpMock.expectOne(
      (item) => item.url === `${environment.api.baseUrl}/notifications/readnotification/8110357412/${idNotification}`,
    );
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
