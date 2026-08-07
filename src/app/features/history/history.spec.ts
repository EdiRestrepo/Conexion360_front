import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Params, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { SearchFilters } from '../../core/models/common.model';
import { LogisticDates, OperationType, Shipment, TransportMode } from '../../core/models/shipment.model';
import { ApiHistoryService } from '../../core/services/api-history.service';
import { MyShipmentsPage } from '../../core/services/shipments-page.mapper';
import { History } from './history';

describe('History', () => {
  let fixture: ComponentFixture<History>;
  let component: HistoryTestComponent;
  let router: Router;
  let searchSpy: jasmine.Spy<(filters: SearchFilters) => Observable<MyShipmentsPage>>;
  let queryParamSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let currentParams: Record<string, string>;

  beforeEach(async () => {
    currentParams = {};
    queryParamSubject = new BehaviorSubject(convertToParamMap(currentParams));
    searchSpy = jasmine.createSpy('search').and.returnValue(of(createApiPage(createApiShipments())));

    await TestBed.configureTestingModule({
      imports: [History, NoopAnimationsModule],
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
          provide: ApiHistoryService,
          useValue: { search: searchSpy },
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

    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance as unknown as HistoryTestComponent;
  });

  it('should render backend history shipments', fakeAsync(() => {
    render();

    const text = getText();

    expect(text).toContain('AWB-DEL-001');
    expect(text).toContain('HBL-DEL-002');
  }));

  it('should render dashes for unavailable dates', fakeAsync(() => {
    searchSpy.and.returnValue(of(createApiPage([createApiShipment({ documentNumber: 'AWB-NODATE', logisticDates: { etd: null, atd: null, eta: null, ata: null } })])));
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance as unknown as HistoryTestComponent;
    render();

    const dashCells = Array.from(fixture.nativeElement.querySelectorAll('[role="cell"]') as NodeListOf<HTMLElement>).filter(
      (cell) => cell.textContent?.trim() === '-',
    );

    expect(dashCells.length).toBeGreaterThanOrEqual(4);
    expect(getText()).not.toContain('null');
    expect(getText()).not.toContain('undefined');
  }));

  it('should render dates with Base44 numeric format', fakeAsync(() => {
    render();

    expect(getText()).toContain('05/01/2026');
    expect(getText()).not.toContain('05 de ene de 2026');
  }));

  it('should render all backend summary pills in requested order', fakeAsync(() => {
    render();

    const pills = Array.from(fixture.nativeElement.querySelectorAll('.summary-pill') as NodeListOf<HTMLElement>);
    const labels = ['envíos', 'exportaciones', 'importaciones', 'aéreos', 'marítimos', 'con novedad'];
    const numbers = ['2', '1', '1', '1', '1', '0'];

    expect(pills.length).toBe(6);
    pills.forEach((pill, index) => {
      expect(pill.querySelector('strong')?.textContent?.trim()).toBe(numbers[index]);
      expect(pill.textContent).toContain(labels[index]);
    });
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

  it('should request backend data with combined query params', fakeAsync(() => {
    render();
    setQueryParams({ query: 'China', operation: 'EXPO', mode: 'AIR' });

    expect(searchSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      query: 'China',
      operationType: 'EXPO',
      transportMode: 'AIR',
      page: 1,
      pageSize: 10,
    }));
  }));

  it('should restore query params in controls', fakeAsync(() => {
    render();
    setQueryParams({ query: 'Bogota', operation: 'EXPO', mode: 'SEA', pageSize: '25' });

    expect(component.searchControl.value).toBe('Bogota');
    expect(component.operationControl.value).toBe('EXPO');
    expect(component.modeControl.value).toBe('SEA');
    expect(component.pageSizeControl.value).toBe(25);
  }));

  it('should paginate with 10 items by default and navigate pages', fakeAsync(() => {
    searchSpy.and.callFake((filters) =>
      of(createApiPage(createPaginatedApiShipments(Number(filters.page ?? 1), Number(filters.pageSize ?? 10)), 12, Number(filters.page ?? 1), Number(filters.pageSize ?? 10))),
    );
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance as unknown as HistoryTestComponent;
    render();

    expect(getTableRows().length).toBe(10);
    expect(getText()).toContain('1-10 de 12');

    clickButton('Página siguiente');
    tick();
    fixture.detectChanges();

    expect(getTableRows().length).toBe(2);
    expect(getText()).toContain('11-12 de 12');
  }));

  it('should update query params when page size changes', fakeAsync(() => {
    render();

    component.pageSizeControl.setValue(25);
    tick();

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ pageSize: 25, page: 1 }),
      queryParamsHandling: 'merge',
    }));
  }));

  it('should navigate to detail preserving filters', fakeAsync(() => {
    render();
    setQueryParams({ query: 'Enka', page: '1' });

    const link = fixture.nativeElement.querySelector('a[title="Ver detalle"]') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toContain('/shipments/');
    expect(link.getAttribute('href')).toContain('query=Enka');
    expect(link.getAttribute('href')).toContain('from=history');
  }));

  it('should render empty state when there are no matching results', fakeAsync(() => {
    searchSpy.and.returnValue(of(createApiPage([], 0, 1, 10)));
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance as unknown as HistoryTestComponent;
    render();
    setQueryParams({ query: 'Sin coincidencias' });

    expect(getText()).toContain('No hay envíos completados que coincidan con los filtros.');
  }));

  it('should render controlled error state and retry', fakeAsync(() => {
    searchSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance as unknown as HistoryTestComponent;
    render();

    expect(getText()).toContain('No se pudo cargar el historial');
    clickButton('Reintentar');

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { query: null, operation: null, mode: null, page: null, pageSize: null },
    }));
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
      fixture.nativeElement.querySelectorAll('.history-table__row:not(.history-table__row--head)') as NodeListOf<HTMLElement>,
    );
  }

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((item) =>
      item.textContent?.includes(label) || item.getAttribute('aria-label')?.includes(label) || item.title.includes(label),
    );
    if (!button) {
      throw new Error(`No se encontró el botón ${label}`);
    }
    button.click();
  }
});

interface HistoryTestComponent {
  searchControl: FormControl<string>;
  operationControl: FormControl<OperationType | ''>;
  modeControl: FormControl<TransportMode | ''>;
  pageSizeControl: FormControl<number>;
}

interface ShipmentInput extends Partial<Omit<Shipment, 'logisticDates'>> {
  logisticDates?: Partial<LogisticDates>;
}

function createApiShipments(): Shipment[] {
  return [
    createApiShipment({ id: 'delivered-001', documentNumber: 'AWB-DEL-001', operationType: 'IMPO', transportMode: 'AIR', client: 'Enka' }),
    createApiShipment({ id: 'delivered-002', documentNumber: 'HBL-DEL-002', operationType: 'EXPO', transportMode: 'SEA', client: 'Nutresa' }),
  ];
}

function createPaginatedApiShipments(page: number, pageSize: number): Shipment[] {
  const start = (page - 1) * pageSize;

  return Array.from({ length: 12 }, (_, index) =>
    createApiShipment({
      id: `delivered-page-${index + 1}`,
      documentNumber: `AWB-PAGE-${(index + 1).toString().padStart(3, '0')}`,
      client: index % 2 === 0 ? 'Enka' : 'Nutresa',
      transportMode: index % 2 === 0 ? 'AIR' : 'SEA',
    }),
  ).slice(start, start + pageSize);
}

function createApiPage(items: Shipment[], totalItems = items.length, page = 1, pageSize = 10): MyShipmentsPage {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
    summary: {
      total: totalItems,
      air: items.filter((shipment) => shipment.transportMode === 'AIR').length,
      sea: items.filter((shipment) => shipment.transportMode === 'SEA').length,
      imports: items.filter((shipment) => shipment.operationType === 'IMPO').length,
      exports: items.filter((shipment) => shipment.operationType === 'EXPO').length,
      withIssues: items.filter((shipment) => shipment.status === 'WITH_ISSUE').length,
    },
  };
}

function createApiShipment(input: ShipmentInput = {}): Shipment {
  return {
    id: 'delivered-base',
    documentNumber: 'AWB-BASE-001',
    operationType: 'IMPO',
    transportMode: 'AIR',
    status: 'DELIVERED',
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
      eta: '2026-01-08',
      ata: '2026-01-09',
      ...input.logisticDates,
    },
    financialInfo: { advancePayment: null, invoice: null },
    documents: [],
    events: [],
    issue: null,
    progress: 100,
    nextStop: null,
    ...input,
  };
}
