import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { take } from 'rxjs';

import { MockNotificationService } from './mock-notification.service';

describe('MockNotificationService', () => {
  let service: MockNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockNotificationService);
    service.configureSimulation({ latencyMs: 0 });
  });

  afterEach(() => service.resetSimulation());

  it('should load notifications', fakeAsync(() => {
    service.getAll().subscribe((notifications) => {
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].shipmentDocument).toBeTruthy();
    });
    tick();
  }));

  it('should build mockup style titles, descriptions and locations', fakeAsync(() => {
    service.getAll().subscribe((notifications) => {
      const delivery = notifications.find((notification) => notification.type === 'DELIVERY');
      const customs = notifications.find((notification) => notification.type === 'CUSTOMS');

      expect(delivery?.title).toMatch(/Envío entregado|Entregado en destino/);
      expect(delivery?.description).toContain(delivery?.status === 'DELIVERED' ? 'entregado' : '');
      expect(customs?.title).toBe('En aduana');
      expect(customs?.description).toContain("ha pasado a estado 'En aduana'");
      expect(customs?.description).toContain('→');
      expect(customs?.location).toMatch(/^.+, .+$/);
    });
    tick();
  }));

  it('should mark one notification as read and update unread count', fakeAsync(() => {
    let notificationId = '';
    service.getUnread().subscribe((notifications) => {
      notificationId = notifications[0].id;
    });
    tick();

    service.markAsRead(notificationId).subscribe((notification) => {
      expect(notification?.read).toBeTrue();
    });
    tick();

    service.getUnread().subscribe((notifications) => {
      expect(notifications.some((notification) => notification.id === notificationId)).toBeFalse();
    });
    tick();
  }));

  it('should mark all notifications as read', fakeAsync(() => {
    service.markAllAsRead().subscribe((notifications) => {
      expect(notifications.every((notification) => notification.read)).toBeTrue();
    });
    tick();

    service.getUnreadCount().pipe(take(1)).subscribe((count) => expect(count).toBe(0));
    tick();
  }));

  it('should simulate empty and error responses', fakeAsync(() => {
    service.configureSimulation({ responseMode: 'empty', latencyMs: 0 });
    service.getAll().subscribe((notifications) => expect(notifications).toEqual([]));
    tick();

    service.configureSimulation({ responseMode: 'error', latencyMs: 0 });
    service.getAll().subscribe({ error: (error: Error) => expect(error.message).toContain('Error simulado') });
    tick();
  }));
});