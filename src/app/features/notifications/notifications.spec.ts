import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { Notification } from '../../core/models/notification.model';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let fixture: ComponentFixture<Notifications>;
  let getAllSpy: jasmine.Spy<() => Observable<Notification[]>>;
  let markAsReadSpy: jasmine.Spy<(id: string) => Observable<Notification | null>>;

  beforeEach(async () => {
    getAllSpy = jasmine.createSpy('getAll').and.returnValue(of(createNotifications()));
    markAsReadSpy = jasmine.createSpy('markAsRead').and.callFake((id: string) => of(createNotifications().find((notification) => notification.id === id) ?? null));

    await TestBed.configureTestingModule({
      imports: [Notifications, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: 'shipments/:id', component: BlankRouteComponent }]),
        {
          provide: NOTIFICATION_DATA_SOURCE,
          useValue: {
            getAll: getAllSpy,
            markAsRead: markAsReadSpy,
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
    expect(getText()).toContain('Demora en puerto');
  }));

  it('should render document, headline, date and location like the mockup', fakeAsync(() => {
    render();

    const card = fixture.nativeElement.querySelector('.notification-card') as HTMLAnchorElement;

    expect(card.querySelector('.notification-card__document')?.textContent).toContain('AWB-001');
    expect(card.querySelector('.notification-card__headline')?.textContent).toContain('Demora en puerto');
    expect(card.querySelector('.notification-card__meta')?.textContent).toContain('5 ene, 10:30');
    expect(card.querySelector('.notification-card__meta')?.textContent).toContain('Cartagena, Colombia');
  }));

  it('should filter unread notifications', fakeAsync(() => {
    render();
    clickButton('No leídos');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('AWB-001');
    expect(getText()).not.toContain('HBL-002');
  }));

  it('should mark a notification as read when its card is opened', fakeAsync(() => {
    render();

    const card = fixture.nativeElement.querySelector('.notification-card') as HTMLAnchorElement;
    card.click();
    tick();

    expect(card.getAttribute('href')).toContain('/shipments/shipment-001');
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
      title: 'Demora en puerto',
      description: 'El envío de Zenú presenta una demora de 2 días en el puerto de Cartagena por congestión portuaria.',
      createdAt: '2026-01-05T10:30:00.000Z',
      location: 'Cartagena, Colombia',
      read: false,
      status: 'WITH_ISSUE',
    },
    {
      id: 'notification-002',
      type: 'DELIVERY',
      shipmentId: 'shipment-002',
      shipmentDocument: 'HBL-002',
      title: 'Envío entregado',
      description: 'El envío de Postobon (Cartagena → Miami) ha sido entregado exitosamente.',
      createdAt: '2026-01-04T09:00:00.000Z',
      location: 'Miami, Estados Unidos',
      read: true,
      status: 'DELIVERED',
    },
    {
      id: 'notification-003',
      type: 'DOCUMENT',
      shipmentId: 'shipment-003',
      shipmentDocument: 'AWB-003',
      title: 'Documento pendiente',
      description: 'El envío de Enka tiene documentos pendientes de validación.',
      createdAt: '2026-01-03T08:00:00.000Z',
      location: null,
      read: false,
      status: 'WITH_ISSUE',
    },
  ];
}
