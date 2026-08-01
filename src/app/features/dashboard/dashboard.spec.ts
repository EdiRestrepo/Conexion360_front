import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AuthSession } from '../../core/models/auth-session.model';
import { DashboardMetrics } from '../../core/models/shipment.model';
import { ApiHomeService, HomeShipmentSummary } from '../../core/services/api-home.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: DashboardTestComponent;
  let searchSpy: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    searchSpy = jasmine.createSpy('search').and.returnValue(of({ items: [], page: 1, pageSize: 30, totalItems: 0, totalPages: 0 }));

    await TestBed.configureTestingModule({
      imports: [Dashboard, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: {
            currentSession: signal(createSession('Iván Valencia')),
          },
        },
        {
          provide: ApiHomeService,
          useValue: {
            getDashboardMetrics: jasmine.createSpy('getDashboardMetrics').and.returnValue(of(createDashboardMetrics())),
            getRecent: jasmine.createSpy('getRecent').and.returnValue(of(createShipments().slice(0, 5))),
            search: searchSpy,
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance as unknown as DashboardTestComponent;
  });

  it('should render greeting with profile name', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('¡Hola, Iván Valencia!');
    expect(getText()).toContain('Resumen de envíos internacionales');
  }));

  it('should render metrics calculated from service', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const text = getText();

    expect(text).toContain('Total de envíos');
    expect(text).toContain('30');
    expect(text).toContain('Importaciones');
    expect(text).toContain('Aéreos');
    expect(text).toContain('Con novedad');
  }));

  it('should render distribution percentages with progressbars', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const progressbars = fixture.nativeElement.querySelectorAll('[role="progressbar"]') as NodeListOf<HTMLElement>;

    expect(progressbars.length).toBe(4);
    expect(progressbars[0].getAttribute('aria-valuenow')).toBe('50');
    expect(progressbars[2].getAttribute('aria-valuenow')).toBe('40');
  }));

  it('should render at least five recent shipments with detail links', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const recentItems = fixture.nativeElement.querySelectorAll('.recent-item') as NodeListOf<HTMLAnchorElement>;

    expect(recentItems.length).toBe(5);
    expect(recentItems[0].getAttribute('href')).toContain('/shipments/shipment-001');
    expect(getText()).toContain('AWB-001');
  }));

  it('should navigate to shipment detail when search has one result', fakeAsync(() => {
    searchSpy.and.returnValue(of({ items: [createShipments()[0]], page: 1, pageSize: 30, totalItems: 1, totalPages: 1 }));
    fixture.detectChanges();
    tick();
    component.searchControl.setValue('AWB-001');
    component.searchShipment();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/shipments', 'shipment-001']);
  }));

  it('should navigate to shipments with query params when search has multiple results', fakeAsync(() => {
    searchSpy.and.returnValue(of({ items: createShipments().slice(0, 2), page: 1, pageSize: 30, totalItems: 2, totalPages: 1 }));
    fixture.detectChanges();
    tick();
    component.searchControl.setValue('AWB');
    component.searchShipment();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/shipments'], { queryParams: { q: 'AWB' } });
  }));

  it('should show a message when search has no results', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.searchControl.setValue('MBL-NO-EXISTE');
    component.searchShipment();
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('No encontramos envíos con ese documento.');
  }));

  it('should not execute search when field is empty', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.searchControl.setValue('   ');
    component.searchShipment();
    tick();

    expect(searchSpy).not.toHaveBeenCalled();
  }));

  it('should render error state and retry action', fakeAsync(() => {
    const service = TestBed.inject(ApiHomeService) as unknown as {
      getDashboardMetrics: jasmine.Spy<() => Observable<DashboardMetrics>>;
      getRecent: jasmine.Spy<() => Observable<HomeShipmentSummary[]>>;
    };
    service.getDashboardMetrics.and.returnValue(throwError(() => new Error('error')));
    fixture = TestBed.createComponent(Dashboard);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('No se pudo cargar el dashboard');

    service.getDashboardMetrics.and.returnValue(of(createDashboardMetrics()));
    const retryButton = fixture.nativeElement.querySelector('.error-state button') as HTMLButtonElement;
    retryButton.click();
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('Total de envíos');
  }));

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

interface DashboardTestComponent {
  searchControl: FormControl<string>;
  searchShipment: () => void;
}

function createSession(name: string): AuthSession {
  return {
    user: {
      id: 'auth0|123',
      name,
      email: 'ivan.valencia@conexion360.com',
      role: 'CLIENT',
    },
    accessToken: '',
    expiresAt: '2026-07-22T00:00:00.000Z',
  };
}

function createDashboardMetrics(): DashboardMetrics {
  return {
    totalShipments: 30,
    totalImports: 15,
    totalExports: 15,
    totalAir: 12,
    totalSea: 18,
    totalDelivered: 6,
    totalWithIssue: 5,
    totalActive: 23,
    totalPending: 2,
  };
}

function createShipments(): HomeShipmentSummary[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `shipment-00${index + 1}`,
    documentNumber: `AWB-00${index + 1}`,
    operationType: index % 2 === 0 ? 'IMPO' : 'EXPO',
    transportMode: index % 2 === 0 ? 'AIR' : 'SEA',
    status: index === 0 ? 'IN_TRANSIT' : 'DELIVERED',
    origin: { country: 'México' },
    destination: { country: 'Colombia' },
  }));
}
