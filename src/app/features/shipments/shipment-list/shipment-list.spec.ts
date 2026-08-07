import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Params, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import {
  LogisticDates,
  OperationType,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from '../../../core/models/shipment.model';
import { MockShipmentService } from '../../../mocks/services/mock-shipment.service';
import { ShipmentList } from './shipment-list';

describe('ShipmentList', () => {
  let fixture: ComponentFixture<ShipmentList>;
  let component: ShipmentListTestComponent;
  let router: Router;
  let getActiveSpy: jasmine.Spy<() => Observable<Shipment[]>>;
  let queryParamSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let currentParams: Record<string, string>;

  beforeEach(async () => {
    currentParams = {};
    queryParamSubject = new BehaviorSubject(convertToParamMap(currentParams));
    getActiveSpy = jasmine.createSpy('getActive').and.returnValue(of(createShipments()));

    await TestBed.configureTestingModule({
      imports: [ShipmentList, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamSubject.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}), queryParams: {} },
          },
        },
        {
          provide: MockShipmentService,
          useValue: { getActive: getActiveSpy },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.callFake((_commands: unknown[], extras?: { queryParams?: Params }) => {
      if (extras?.queryParams) {
        applyQueryParams(extras.queryParams);
      }
      return Promise.resolve(true);
    });

    fixture = TestBed.createComponent(ShipmentList);
    component = fixture.componentInstance as unknown as ShipmentListTestComponent;
  });

  it('should render active shipments only', fakeAsync(() => {
    render();

    const text = getText();

    expect(text).toContain('AWB-ACT-001');
    expect(text).toContain('HBL-ACT-002');
    expect(text).not.toContain('AWB-DEL-001');
    expect(text).not.toContain('HBL-CAN-001');
  }));

  it('should debounce search and keep query params', fakeAsync(() => {
    render();

    component.searchControl.setValue('Enka');
    tick(249);
    expect(router.navigate).not.toHaveBeenCalled();

    tick(1);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ query: 'Enka', page: 1 }),
      queryParamsHandling: 'merge',
    }));
  }));

  it('should apply combined operation, mode and status filters from query params', fakeAsync(() => {
    render();
    setQueryParams({ operation: 'IMPO', mode: 'AIR', status: 'IN_TRANSIT' });

    const text = getText();

    expect(text).toContain('AWB-ACT-001');
    expect(text).not.toContain('HBL-ACT-002');
    expect(text).not.toContain('AWB-ACT-003');
  }));

  it('should restore query params in controls', fakeAsync(() => {
    render();
    setQueryParams({ query: 'Bogota', operation: 'EXPO', mode: 'SEA', status: 'WITH_ISSUE', pageSize: '25' });

    expect(component.searchControl.value).toBe('Bogota');
    expect(component.operationControl.value).toBe('EXPO');
    expect(component.modeControl.value).toBe('SEA');
    expect(component.statusControl.value).toBe('WITH_ISSUE');
    expect(component.pageSizeControl.value).toBe(25);
  }));

  it('should paginate with 10 items by default and navigate pages', fakeAsync(() => {
    getActiveSpy.and.returnValue(of(createPaginatedShipments()));
    fixture = TestBed.createComponent(ShipmentList);
    component = fixture.componentInstance as unknown as ShipmentListTestComponent;
    render();

    expect(getTableRows().length).toBe(10);
    expect(getText()).toContain('Mostrando 1-10 de 12');

    clickButton('Siguiente');
    tick();
    fixture.detectChanges();

    expect(getTableRows().length).toBe(2);
    expect(getText()).toContain('Mostrando 11-12 de 12');
  }));

  it('should reset page when page size changes', fakeAsync(() => {
    render();

    component.pageSizeControl.setValue(25);
    tick();

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ pageSize: 25, page: 1 }),
      queryParamsHandling: 'merge',
    }));
  }));

  it('should render dashes for unavailable dates', fakeAsync(() => {
    getActiveSpy.and.returnValue(of([createShipment({ documentNumber: 'AWB-NODATE', logisticDates: {} })]));
    fixture = TestBed.createComponent(ShipmentList);
    component = fixture.componentInstance as unknown as ShipmentListTestComponent;
    render();

    const dashCells = Array.from(fixture.nativeElement.querySelectorAll('[role="cell"]') as NodeListOf<HTMLElement>).filter(
      (cell) => cell.textContent?.trim() === '-',
    );

    expect(dashCells.length).toBeGreaterThanOrEqual(4);
    expect(getText()).not.toContain('null');
    expect(getText()).not.toContain('undefined');
  }));

  it('should preserve filters in detail links', fakeAsync(() => {
    render();
    setQueryParams({ query: 'Enka', operation: 'IMPO', page: '2', pageSize: '25' });

    const link = fixture.nativeElement.querySelector('a[href*="/shipments/"]') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toContain('/shipments/');
    expect(link.getAttribute('href')).toContain('query=Enka');
    expect(link.getAttribute('href')).toContain('operation=IMPO');
    expect(link.getAttribute('href')).toContain('pageSize=25');
  }));

  it('should render an empty state when filters have no results', fakeAsync(() => {
    render();
    setQueryParams({ query: 'NO-EXISTE' });

    expect(getText()).toContain('No hay envíos activos que coincidan con los filtros.');
  }));

  it('should render controlled error state', fakeAsync(() => {
    getActiveSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(ShipmentList);
    component = fixture.componentInstance as unknown as ShipmentListTestComponent;
    render();

    expect(getText()).toContain('No se pudo cargar la información');
    expect(getText()).toContain('Reintentar');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function setQueryParams(params: Record<string, string>): void {
    currentParams = { ...params };
    queryParamSubject.next(convertToParamMap(currentParams));
    tick();
    fixture.detectChanges();
  }

  function applyQueryParams(params: Params): void {
    const nextParams = { ...currentParams };
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        delete nextParams[key];
      } else {
        nextParams[key] = String(value);
      }
    });
    currentParams = nextParams;
    queryParamSubject.next(convertToParamMap(currentParams));
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function getTableRows(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.shipments-table__row:not(.shipments-table__row--head)') as NodeListOf<HTMLElement>,
    );
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

interface ShipmentListTestComponent {
  searchControl: FormControl<string>;
  operationControl: FormControl<OperationType | ''>;
  modeControl: FormControl<TransportMode | ''>;
  statusControl: FormControl<ShipmentStatus | ''>;
  pageSizeControl: FormControl<number>;
}

interface ShipmentInput extends Partial<Omit<Shipment, 'logisticDates'>> {
  logisticDates?: Partial<LogisticDates>;
}

function createShipments(): Shipment[] {
  return [
    createShipment({ id: 'active-001', documentNumber: 'AWB-ACT-001', operationType: 'IMPO', transportMode: 'AIR', status: 'IN_TRANSIT', client: 'Enka' }),
    createShipment({ id: 'active-002', documentNumber: 'HBL-ACT-002', operationType: 'EXPO', transportMode: 'SEA', status: 'WITH_ISSUE', client: 'Nutresa' }),
    createShipment({ id: 'active-003', documentNumber: 'AWB-ACT-003', operationType: 'IMPO', transportMode: 'AIR', status: 'PENDING', client: 'Postobon' }),
    createShipment({ id: 'delivered-001', documentNumber: 'AWB-DEL-001', status: 'DELIVERED' }),
    createShipment({ id: 'issue-001', documentNumber: 'HBL-ISS-001', status: 'WITH_ISSUE', transportMode: 'SEA' }),
  ];
}

function createPaginatedShipments(): Shipment[] {
  return Array.from({ length: 12 }, (_, index) =>
    createShipment({
      id: `active-page-${index + 1}`,
      documentNumber: `AWB-PAGE-${(index + 1).toString().padStart(3, '0')}`,
      client: index % 2 === 0 ? 'Enka' : 'Nutresa',
      transportMode: index % 2 === 0 ? 'AIR' : 'SEA',
    }),
  );
}

function createShipment(input: ShipmentInput = {}): Shipment {
  return {
    id: 'active-base',
    documentNumber: 'AWB-BASE-001',
    operationType: 'IMPO',
    transportMode: 'AIR',
    status: 'IN_TRANSIT',
    client: 'Enka',
    provider: 'Global Freight Logistics S.A.S.',
    incoterm: 'DAP',
    origin: { country: 'México', city: 'Ciudad de México', terminal: null },
    destination: { country: 'Colombia', city: 'Bogotá', terminal: null },
    merchandiseDescription: 'Textiles',
    cargoType: 'LCL',
    packages: 10,
    weightKg: 200,
    volumeM3: 4,
    carrier: 'Avianca Cargo',
    logisticDates: {
      etd: '2026-01-05',
      atd: '2026-01-06',
      eta: '2026-01-10',
      ata: null,
      ...input.logisticDates,
    },
    financialInfo: { advancePayment: null, invoice: null },
    documents: [],
    events: [],
    issue: null,
    progress: 50,
    nextStop: 'Aduana destino',
    ...input,
  };
}
