import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { Notification } from '../../core/models/notification.model';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let fixture: ComponentFixture<Notifications>;
  let getAllSpy: jasmine.Spy<() => Observable<Notification[]>>;
  let markAsReadSpy: jasmine.Spy<(id: string) => Observable<Notification | null>>;
  let reloadSpy: jasmine.Spy<() => void>;

  beforeEach(async () => {
    getAllSpy = jasmine.createSpy('getAll').and.returnValue(of(createNotifications()));
    reloadSpy = jasmine.createSpy('reload');
    markAsReadSpy = jasmine
      .createSpy('markAsRead')
      .and.callFake((id: string) => of(createNotifications().find((notification) => notification.id === id) ?? null));

    await TestBed.configureTestingModule({
      imports: [Notifications, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: 'shipments/:id', component: BlankRouteComponent }]),
        {
          provide: NOTIFICATION_DATA_SOURCE,
          useValue: {
            getAll: getAllSpy,
            markAsRead: markAsReadSpy,
            reload: reloadSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
  });

  it('should load notifications', fakeAsync(() => {
    render();

    expect(getText()).toContain('Notificaciones');
    expect(getText()).toContain('HBL-5U6HC36K');
    expect(getText()).toContain('Cambio de estado a pendiente');
  }));

  it('should render document, headline and notification date', fakeAsync(() => {
    render();

    const card = getCards()[0];

    expect(card.querySelector('.notification-card__document')?.textContent).toContain('HBL-5U6HC36K');
    expect(card.querySelector('.notification-card__headline')?.textContent).toContain('Cambio de estado a pendiente');
    expect(card.querySelector('.notification-card__description')?.textContent).toContain('queda pendiente de procesamiento');
    // Ordena y muestra `notificationDate` (17 ago), no `messageDate` (14 ago).
    expect(card.querySelector('.notification-card__meta')?.textContent).toContain('17 ago');
  }));

  it('should filter unread notifications', fakeAsync(() => {
    render();
    clickButton('No leídos');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('HBL-5U6HC36K');
    expect(getText()).not.toContain('AWB-0000063Z');
  }));

  it('should open the detail dialog and mark the notification as read', fakeAsync(() => {
    render();

    getCards()[0].click();
    tick();
    fixture.detectChanges();

    const dialog = document.querySelector('mat-dialog-container');

    expect(dialog?.textContent).toContain('Cambio de estado a pendiente');
    expect(dialog?.textContent).toContain('Se registra el envío en el sistema');
    expect(dialog?.textContent).toContain('Documento de transporte');
    expect(markAsReadSpy).toHaveBeenCalledWith('1');

    closeDialog('Cerrar');
  }));

  it('should navigate to the shipment from the dialog', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    render();

    getCards()[0].click();
    tick();
    fixture.detectChanges();

    closeDialog('Ver envío');

    expect(navigateSpy).toHaveBeenCalledWith(['/shipments', 'HBL-5U6HC36K'], {
      queryParams: { document: 'HBL-5U6HC36K' },
    });
  }));

  it('should not mark an already read notification again', fakeAsync(() => {
    render();

    getCards()[1].click();
    tick();
    fixture.detectChanges();

    expect(markAsReadSpy).not.toHaveBeenCalled();

    closeDialog('Cerrar');
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

    expect(getText()).toContain('HBL-5U6HC36K');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function getCards(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.notification-card') as NodeListOf<HTMLButtonElement>);
  }

  function findButton(root: ParentNode, label: string): HTMLButtonElement {
    const button = Array.from(root.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((item) =>
      item.textContent?.includes(label),
    );

    if (!button) {
      throw new Error(`No se encontró el botón ${label}`);
    }

    return button;
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label).click();
  }

  /** Cierra el modal y deja el DOM limpio para la siguiente prueba. */
  function closeDialog(label: string): void {
    const container = document.querySelector('mat-dialog-container');

    if (!container) {
      throw new Error('No se encontró el modal de detalle');
    }

    findButton(container, label).click();
    tick();
    fixture.detectChanges();
    flush();
  }
});

@Component({ template: '' })
class BlankRouteComponent {}

function createNotifications(): Notification[] {
  return [
    {
      id: '1',
      type: 'STATUS_CHANGE',
      shipmentDocument: 'HBL-5U6HC36K',
      title: 'Cambio de estado a pendiente.',
      description: 'Se registra el envío en el sistema, queda pendiente de procesamiento.',
      createdAt: '2026-08-17T21:54:08.000Z',
      eventDate: '2026-08-14T21:54:08.000Z',
      read: false,
    },
    {
      id: '2',
      type: 'COMMENT',
      shipmentDocument: 'AWB-0000063Z',
      title: 'Comentario del analista',
      description: 'Se solicitó al proveedor la confirmación del zarpe.',
      createdAt: '2026-08-16T09:00:00.000Z',
      eventDate: null,
      read: true,
    },
  ];
}
