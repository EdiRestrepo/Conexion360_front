import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { take } from 'rxjs';

import { Notification } from '../../core/models/notification.model';
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
    service.getAll().pipe(take(1)).subscribe((notifications) => {
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].shipmentDocument).toBeTruthy();
    });
    tick();
  }));

  it('should build mockup style titles, descriptions and locations', fakeAsync(() => {
    service.getAll().pipe(take(1)).subscribe((notifications) => {
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
    service.getUnread().pipe(take(1)).subscribe((notifications) => {
      notificationId = notifications[0].id;
    });
    tick();

    service.markAsRead(notificationId).subscribe((notification) => {
      expect(notification?.read).toBeTrue();
    });
    tick();

    service.getUnread().pipe(take(1)).subscribe((notifications) => {
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
    service.getAll().pipe(take(1)).subscribe((notifications) => expect(notifications).toEqual([]));
    tick();

    service.configureSimulation({ responseMode: 'error', latencyMs: 0 });
    service.getAll().subscribe({ error: (error: Error) => expect(error.message).toContain('Error simulado') });
    tick();
  }));

  it('should push a new unread notification when a live arrival is simulated', fakeAsync(() => {
    let notifications: Notification[] = [];
    service.getAll().subscribe((value) => (notifications = value));
    tick();
    const initialCount = notifications.length;

    service.simulateLiveArrival();
    tick();

    expect(notifications.length).toBe(initialCount + 1);
    expect(notifications[0].read).toBeFalse();
    expect(new Date(notifications[0].createdAt).getTime()).toBeGreaterThan(new Date(notifications[1].createdAt).getTime());

    service.getUnreadCount().pipe(take(1)).subscribe((count) => expect(count).toBeGreaterThan(0));
    tick();
  }));
});