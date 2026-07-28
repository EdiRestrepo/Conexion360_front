import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Notification } from '../../core/models/notification.model';
import { MockNotificationService } from '../../mocks/services/mock-notification.service';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let fixture: ComponentFixture<Notifications>;
  let getAllSpy: jasmine.Spy<() => Observable<Notification[]>>;
  let markAsReadSpy: jasmine.Spy<(id: string) => Observable<Notification | null>>;
  let markAllAsReadSpy: jasmine.Spy<() => Observable<Notification[]>>;

  beforeEach(async () => {
    getAllSpy = jasmine.createSpy('getAll').and.returnValue(of(createNotifications()));
    markAsReadSpy = jasmine.createSpy('markAsRead').and.callFake((id: string) => of(createNotifications().find((notification) => notification.id === id) ?? null));
    markAllAsReadSpy = jasmine.createSpy('markAllAsRead').and.returnValue(of(createNotifications().map((notification) => ({ ...notification, read: true }))));

    await TestBed.configureTestingModule({
      imports: [Notifications, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: 'shipments/:id', component: BlankRouteComponent }]),
        {
          provide: MockNotificationService,
          useValue: {
            getAll: getAllSpy,
            markAsRead: markAsReadSpy,
            markAllAsRead: markAllAsReadSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
  });

  it('should load notifications', fakeAsync(() => {
    render();

    expect(getText()).toContain('Notificaciones');
    expect(getText()).toContain('AWB-001');
    expect(getText()).toContain('Demora registrada');
  }));

  it('should filter unread notifications', fakeAsync(() => {
    render();
    clickButton('No leídos');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('AWB-001');
    expect(getText()).not.toContain('HBL-002');
  }));

  it('should mark one notification as read', fakeAsync(() => {
    render();

    const button = fixture.nativeElement.querySelector('button[title="Marcar como leída"]') as HTMLButtonElement;
    button.click();
    tick();
    fixture.detectChanges();

    expect(markAsReadSpy).toHaveBeenCalledWith('notification-001');
  }));

  it('should mark all notifications as read', fakeAsync(() => {
    render();
    clickButton('Marcar todos como leídos');
    tick();

    expect(markAllAsReadSpy).toHaveBeenCalled();
  }));

  it('should render unread counter', fakeAsync(() => {
    render();

    expect(getText()).toContain('2 no leídas');
  }));

  it('should render detail navigation links', fakeAsync(() => {
    render();

    const link = fixture.nativeElement.querySelector('a[title="Abrir envío"]') as HTMLAnchorElement;
    link.click();
    tick();

    expect(link.getAttribute('href')).toContain('/shipments/shipment-001');
    expect(markAsReadSpy).toHaveBeenCalledWith('notification-001');
  }));

  it('should render empty state', fakeAsync(() => {
    getAllSpy.and.returnValue(of([]));
    fixture = TestBed.createComponent(Notifications);
    render();

    expect(getText()).toContain('Sin notificaciones para mostrar');
  }));

  it('should render error state and retry', fakeAsync(() => {
    getAllSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(Notifications);
    render();

    expect(getText()).toContain('No se pudieron cargar las notificaciones');
    getAllSpy.and.returnValue(of(createNotifications()));
    clickButton('Reintentar');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('AWB-001');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((item) =>
      item.textContent?.includes(label),
    );
    if (!button) {
      throw new Error(`No se encontró el botón ${label}`);
    }
    button.click();
  }
});

@Component({ template: '' })
class BlankRouteComponent {}

function createNotifications(): Notification[] {
  return [
    {
      id: 'notification-001',
      type: 'DELAY',
      shipmentId: 'shipment-001',
      shipmentDocument: 'AWB-001',
      title: 'Demora registrada',
      description: 'Retraso operativo en ruta.',
      createdAt: '2026-01-05T10:30:00.000Z',
      location: 'Bogotá, Colombia',
      read: false,
      status: 'WITH_ISSUE',
    },
    {
      id: 'notification-002',
      type: 'DELIVERY',
      shipmentId: 'shipment-002',
      shipmentDocument: 'HBL-002',
      title: 'Entrega completada',
      description: 'Entrega final registrada.',
      createdAt: '2026-01-04T09:00:00.000Z',
      location: 'Medellín, Colombia',
      read: true,
      status: 'DELIVERED',
    },
    {
      id: 'notification-003',
      type: 'DOCUMENT',
      shipmentId: 'shipment-003',
      shipmentDocument: 'AWB-003',
      title: 'Documento pendiente',
      description: 'Documento pendiente de validación.',
      createdAt: '2026-01-03T08:00:00.000Z',
      location: null,
      read: false,
      status: 'WITH_ISSUE',
    },
  ];
}