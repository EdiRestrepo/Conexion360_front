// Auditoría de responsive. NO vive en src/: se copia a src/app/ solo mientras se
// ejecuta (ver ../SKILL.md, «Verificar») y se borra al terminar.
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Route, Router, RouterOutlet, Routes, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { routes } from './app.routes';
import { NOTIFICATION_DATA_SOURCE } from './core/contracts/notification-data-source';
import { SHIPMENT_DATA_SOURCE } from './core/contracts/shipment-data-source';
import { AuthSession } from './core/models/auth-session.model';
import { Notification } from './core/models/notification.model';
import { ReportMetrics, Shipment, ShipmentStatus } from './core/models/shipment.model';
import { SettingsUser } from './core/models/settings-user.model';
import { ApiClientsCollaboratorsService } from './core/services/api-clients-collaborators.service';
import { ApiHistoryService } from './core/services/api-history.service';
import { ApiHomeService, HomeShipmentSummary } from './core/services/api-home.service';
import { ApiMyShipmentsService, MyShipmentsPage } from './core/services/api-my-shipments.service';
import { ApiSettingsUsersService } from './core/services/api-settings-users.service';
import { ApiSettingsService } from './core/services/api-settings.service';
import { ApiShipmentDetailService } from './core/services/api-shipment-detail.service';
import { AuthSessionService } from './core/services/auth-session.service';
import { Auth0FacadeService } from './core/services/auth0-facade.service';
import { IdleSessionService } from './core/services/idle-session.service';
import { NotificationsHubService } from './core/services/notifications-hub.service';
import { ConfirmDeleteDialog } from './features/settings/settings-users/components/confirm-delete-dialog/confirm-delete-dialog';
import { UserDetailDialog } from './features/settings/settings-users/components/user-detail-dialog/user-detail-dialog';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

// Textos largos a propósito: el responsive se rompe con datos reales, no con «Foo».
const statuses: ShipmentStatus[] = ['PENDING', 'ORIGIN_CUSTOMS', 'IN_TRANSIT', 'DESTINATION_CUSTOMS', 'WITH_ISSUE', 'DELIVERED'];
const clients = ['Almacenes Éxito S.A.', 'Postobon', 'Enka de Colombia S.A.', 'Zenú'];
const countries = ['Alemania', 'Brasil', 'China', 'Estados Unidos', 'México', 'Perú'];

function shipment(i: number): Shipment {
  return {
    id: `s-${i}`,
    documentNumber: ['AWB-Y41IBLJH', 'HBL-5U50FH61', 'MBL-PHR62GDS'][i % 3],
    operationType: i % 2 ? 'IMPO' : 'EXPO',
    transportMode: i % 2 ? 'AIR' : 'SEA',
    status: statuses[i % statuses.length],
    client: clients[i % clients.length],
    provider: 'Global Freight Logistics Internacional S.A.S.',
    incoterm: 'DAP',
    origin: { country: 'Colombia', city: 'Bogotá', terminal: null, latitude: 4.711, longitude: -74.0721 },
    destination: { country: countries[i % countries.length], city: 'Hamburgo', terminal: null, latitude: 51.1, longitude: 10.4 },
    merchandiseDescription: 'Textiles y confecciones de algodón para temporada',
    cargoType: 'FCL',
    packages: 12,
    weightKg: 4500,
    volumeM3: 37.5,
    carrier: 'Hapag-Lloyd',
    logisticDates: {
      originWarehouse: '2026-01-01', etd: '2026-01-02', atd: '2026-01-03', eta: '2026-01-25', ata: null,
      destinationWarehouse: null, nationalization: null, dispatch: null, planilla: null, delivery: null,
    },
    container: {
      type: "40' High Cube", quantity: 2, number: 'MSCU1234567', freeDays: 14, remainingDays: 3,
      returnDate: '2026-02-10', delayDays: 4, delayValuePerDay: 125, totalDelayValue: 500, deposit: 'Depósito Contecar Cartagena',
    },
    financialInfo: {
      advancePayment: { requestedAt: '2026-01-01', paidAt: '2026-01-02', amount: 1200000 },
      invoice: {
        providerInvoice: 'FP-000123456', tccInvoice: 'FT-000987654', invoiceNumber: 'FAC-2026-000123',
        invoiceDate: '2026-01-10', expenseDescription: 'Flete internacional marítimo y gastos en origen',
        expenseValue: 15000000, subtotal: 19800000, tax: 3762000, total: 23562000,
      },
    },
    events: [
      { id: 'e1', dateTime: '2026-01-01T08:30:00Z', status: 'PENDING', location: { country: 'Colombia', city: 'Bogotá' },
        description: 'Ingreso a bodega de origen con documentación completa.', source: 'Sistema', user: 'Equipo operaciones' },
      { id: 'e2', dateTime: '2026-01-05T09:30:00Z', status: 'IN_TRANSIT', location: { country: 'Alemania', city: 'Hamburgo' },
        description: 'Zarpe confirmado por la naviera.', source: 'Sistema', user: 'Analista SAC' },
    ],
    issue: null,
    progress: 55,
    nextStop: 'Aduana destino',
  };
}

const shipments = Array.from({ length: 10 }, (_, i) => shipment(i));
const page: MyShipmentsPage = {
  items: shipments, page: 1, pageSize: 10, totalItems: 417, totalPages: 42,
  summary: { total: 417, air: 205, sea: 212, imports: 190, exports: 227, withIssues: 83 },
};
const home: HomeShipmentSummary[] = shipments.map((s) => ({
  id: s.id, documentNumber: s.documentNumber, operationType: s.operationType, transportMode: s.transportMode,
  status: s.status, origin: { country: s.origin.country }, destination: { country: s.destination.country },
}));
const reports: ReportMetrics = {
  totalShipments: 500, totalImports: 228, totalExports: 272, totalAir: 243, totalSea: 257, totalDelivered: 83,
  totalWithIssue: 83, totalActive: 334, totalPending: 50, totalBilledUsd: 1250000000, totalAdvancesUsd: 320000000,
  totalDelayUsd: 7800000, averageProgress: 0,
  byOperationType: { IMPO: 228, EXPO: 272 }, byTransportMode: { AIR: 243, SEA: 257 },
  byStatus: { PENDING: 50, ORIGIN_CUSTOMS: 60, IN_TRANSIT: 90, DESTINATION_CUSTOMS: 134, DELIVERED: 83, WITH_ISSUE: 83 },
  topClients: clients.map((client, i) => ({ client, total: 80 - i * 10 })),
  topRoutes: countries.map((c, i) => ({ route: `Colombia → ${c}`, total: 60 - i * 5 })),
};
const notifications: Notification[] = Array.from({ length: 6 }, (_, i) => ({
  id: `${i}`, type: i % 2 ? 'COMMENT' : 'STATUS_CHANGE', shipmentDocument: 'HBL-5U6HC36K',
  title: i % 2 ? 'Comentario del analista' : 'Cambio de estado a En aduana destino.',
  description: 'Se registra el envío en el sistema, queda pendiente de procesamiento por parte del equipo de operaciones.',
  createdAt: '2026-08-17T21:54:08.000Z', eventDate: '2026-08-14T21:54:08.000Z', read: i > 2,
}));
const user = (i: number): SettingsUser => ({
  userId: `auth0|${i}`, email: ['edisonestival@gmail.com', 'ivanvalencia7866@hotmail.com', 'arturocalle@tcc.com'][i % 3],
  userName: 'Edison Restrepo', nickname: 'edison', phoneNumber: '+573175766335', isBlocked: i === 2,
  createdDate: '2026-08-12T09:31:00Z', updatedDate: '2026-08-30T08:57:00Z', fullName: 'Edison Estival Restrepo Gómez',
  document: '8110357412', company: 'Importaciones y Exportaciones Andinas S.A.S.', picture: null, role: 'ADMIN',
  lastLogin: '2026-08-30T08:57:00Z', emailVerified: true, acceptedDataPolicy: true,
});
const session: AuthSession = {
  user: { id: 'auth0|0', name: 'Edison Restrepo', email: 'edisonestival@gmail.com', role: 'ADMIN', picture: null },
  accessToken: '', expiresAt: '2099-01-01T00:00:00Z',
};

// Las pantallas nuevas se agregan aquí.
const pages = [
  '/dashboard',
  '/shipments',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=summary',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=tracking',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=dates',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=container',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=financial',
  '/shipments/s-0?document=AWB-Y41IBLJH&tab=history',
  '/history',
  '/notifications',
  '/reports',
  '/settings',
  '/settings/notifications',
  '/settings/users',
  '/settings/clients-collaborators',
];

function withoutGuards(list: Routes): Routes {
  return list.map((r): Route => ({
    ...r, canActivate: undefined, canActivateChild: undefined,
    children: r.children ? withoutGuards(r.children) : undefined,
  }));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function describeEl(el: Element): string {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter((c) => !c.startsWith('ng-')).slice(0, 2).join('.') : '';
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
}

function isInsideScroller(el: Element): boolean {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const ox = getComputedStyle(p).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth + 1) {
      return true;
    }
  }
  return false;
}

/**
 * Reporta, por pantalla:
 * - out: elementos fuera del viewport. `.shell__body` tiene `overflow-x: hidden`,
 *   así que un desborde NO genera barra: el contenido se corta sin avisar.
 * - scroll: contenedores que desplazan en horizontal (esperado en tablas).
 * - hiddenAction: la última celda de una fila de tabla queda fuera del contenedor.
 * - clipped: texto cortado sin puntos suspensivos.
 */
function audit(root: Element, label: string): void {
  const vw = document.documentElement.clientWidth;
  const out: string[] = [];
  const scrollers: string[] = [];
  const clipped: string[] = [];
  const hiddenAction: string[] = [];
  const flagged = new Set<Element>();

  root.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return;
    if (el.closest('.leaflet-container') && el !== el.closest('.leaflet-container')) return;

    if ((r.right > vw + 1 || r.left < -1) && !isInsideScroller(el)) {
      if (!el.parentElement || !flagged.has(el.parentElement)) {
        out.push(`${describeEl(el)} [${Math.round(r.left)}→${Math.round(r.right)}] "${(el.textContent ?? '').trim().slice(0, 40)}"`);
      }
      flagged.add(el);
    }

    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
      scrollers.push(`${describeEl(el)} (${el.clientWidth}/${el.scrollWidth})`);
      const firstRowAction = el.querySelector('[role="row"]:nth-child(2) > :last-child');
      if (firstRowAction && firstRowAction.getBoundingClientRect().right > el.getBoundingClientRect().right + 1) {
        hiddenAction.push(describeEl(el));
      }
    }

    if (el.tagName !== 'MAT-ICON' && cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && (el.textContent ?? '').trim()) {
      clipped.push(`${describeEl(el)} "${(el.textContent ?? '').trim().slice(0, 40)}"`);
    }
  });

  console.log(`RESP|${vw}|${label}|pageScroll=${document.documentElement.scrollWidth > vw + 1}|out=${JSON.stringify(out.slice(0, 12))}|scroll=${JSON.stringify(scrollers)}|hiddenAction=${JSON.stringify(hiddenAction)}|clipped=${JSON.stringify(clipped.slice(0, 8))}`);
}

async function shot(name: string): Promise<void> {
  window.scrollTo(0, 0);
  console.log(`SHOT|${name.replace(/[/?=&:]+/g, '_').replace(/^_/, '')}`);
  await wait(1500);
}

describe('responsive audit', () => {
  beforeEach(async () => {
    const listSvc = { search: () => of(page) };
    await TestBed.configureTestingModule({
      imports: [Host, NoopAnimationsModule],
      providers: [
        provideRouter(withoutGuards(routes)),
        { provide: AuthSessionService, useValue: { authError$: of(null), currentSession: signal(session), isLoading$: of(false), logout: () => of(undefined) } },
        { provide: IdleSessionService, useValue: { phase$: of('active'), remainingSeconds: signal(60), start: () => undefined, keepAlive: () => undefined, stop: () => undefined } },
        { provide: NOTIFICATION_DATA_SOURCE, useValue: { getAll: () => of(notifications), getUnreadCount: () => of(4), markAsRead: () => of(null), reload: () => undefined } },
        { provide: NotificationsHubService, useValue: { state$: of('connected'), receivedCount$: of(0) } },
        { provide: ApiHomeService, useValue: {
          getDashboardMetrics: () => of({ totalShipments: 500, totalImports: 228, totalExports: 272, totalAir: 243, totalSea: 257, totalDelivered: 83, totalWithIssue: 83, totalActive: 334, totalPending: 50 }),
          getRecent: () => of(home), search: () => of({ items: home, page: 1, pageSize: 30, totalItems: 10, totalPages: 1 }) } },
        { provide: ApiMyShipmentsService, useValue: listSvc },
        { provide: ApiHistoryService, useValue: listSvc },
        { provide: ApiShipmentDetailService, useValue: { getDetail: () => of(shipments[0]) } },
        { provide: SHIPMENT_DATA_SOURCE, useValue: { getReportMetrics: () => of(reports) } },
        { provide: ApiSettingsService, useValue: {
          getNotificationSettings: () => of({ channelId: 1, eventId: 1, preferences: { email: true, inApp: true, sms: false, shipmentStatusChanges: true, delivery: true, delays: true, shipmentEnRoute: false, deliveryReminders: false } }),
          saveNotificationSettings: () => of(undefined) } },
        { provide: ApiSettingsUsersService, useValue: {
          list: () => of({ items: [0, 1, 2, 3, 4, 5].map(user), page: 1, pageSize: 10, totalItems: 6, totalPages: 1 }),
          getById: () => of(user(0)), update: () => of(undefined), delete: () => of(undefined) } },
        { provide: Auth0FacadeService, useValue: { user$: of({ auth0UserId: 'auth0|0', email: 'edisonestival@gmail.com', name: 'Edison Restrepo', roles: ['ADMIN'], document: '8110357412' }) } },
        { provide: ApiClientsCollaboratorsService, useValue: { createCustomer: () => of({ message: '' }), createCollaborator: () => of({ message: '' }), linkCustomerToCollaborator: () => of({ message: '' }) } },
      ],
    }).compileComponents();
  });

  it('measures every page', async () => {
    const fixture = TestBed.createComponent(Host);
    const router = TestBed.inject(Router);
    console.log(`RESP|${document.documentElement.clientWidth}|viewport|${window.innerWidth}x${window.innerHeight}`);

    for (const url of pages) {
      await router.navigateByUrl(url);
      fixture.detectChanges();
      await wait(700);
      fixture.detectChanges();
      await fixture.whenStable();
      await wait(300);
      audit(fixture.nativeElement as Element, url);
      await shot(url);
    }

    const dialog = TestBed.inject(MatDialog);
    for (const [name, open] of [
      ['dialog:user-detail', () => dialog.open(UserDetailDialog, { data: { user: user(0), isSelf: false }, width: '640px', maxWidth: '95vw' })],
      ['dialog:confirm-delete', () => dialog.open(ConfirmDeleteDialog, { data: user(1), width: '520px', maxWidth: '95vw' })],
    ] as const) {
      const ref = open();
      fixture.detectChanges();
      await wait(400);
      audit(document.querySelector('.cdk-overlay-container') as Element, name);
      await shot(name);
      ref.close();
      await wait(200);
    }

    console.log('DONE|audit');
    fixture.destroy();
    expect(true).toBeTrue();
  }, 300000);
});
