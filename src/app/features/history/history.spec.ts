import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { Shipment } from '../../core/models/shipment.model';
import { MockShipmentService } from '../../mocks/services/mock-shipment.service';
import { History } from './history';

describe('History', () => {
  let fixture: ComponentFixture<History>;
  let router: Router;
  let getDeliveredSpy: jasmine.Spy<() => Observable<Shipment[]>>;
  let querySubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    querySubject = new BehaviorSubject(convertToParamMap({}));
    getDeliveredSpy = jasmine.createSpy('getDelivered').and.returnValue(of(createShipments()));

    await TestBed.configureTestingModule({
      imports: [History, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: querySubject.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: MockShipmentService, useValue: { getDelivered: getDeliveredSpy } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(History);
  });

  it('should render only delivered shipments', fakeAsync(() => {
    render();

    expect(getText()).toContain('AWB-DEL-001');
    expect(getText()).toContain('HBL-DEL-002');
    expect(getText()).not.toContain('AWB-ACT-003');
  }));

  it('should render the shared shipment date columns', fakeAsync(() => {
    render();

    const dataRows = fixture.nativeElement.querySelectorAll('.history-table__row:not(.history-table__row--head)') as NodeListOf<HTMLElement>;
    const firstRowCells = dataRows[0].querySelectorAll('[role="cell"]') as NodeListOf<HTMLElement>;

    expect(firstRowCells[10].textContent).toContain('09/01/2026');
  }));

  it('should search by document, client, origin or destination', fakeAsync(() => {
    render();

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Nutresa';
    input.dispatchEvent(new Event('input'));
    tick(260);

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { query: 'Nutresa', page: 1 },
      queryParamsHandling: 'merge',
    }));
  }));

  it('should filter by operation and mode from query params', fakeAsync(() => {
    setQueryParams({ operation: 'EXPO', mode: 'SEA' });
    render();

    expect(getText()).toContain('HBL-DEL-002');
    expect(getText()).not.toContain('AWB-DEL-001');
  }));

  it('should render summary from filtered delivered results', fakeAsync(() => {
    setQueryParams({ mode: 'AIR' });
    render();

    expect(getText()).toContain('Total envíos');
    expect(getText()).toContain('2');
    expect(getText()).toContain('Exportaciones');
    expect(getText()).toContain('Importaciones');
    expect(getText()).toContain('Aéreos');
    expect(getText()).toContain('Marítimos');
    expect(getText()).toContain('con novedad');
  }));

  it('should paginate and preserve query params', fakeAsync(() => {
    setQueryParams({ page: '2', pageSize: '10', query: 'AWB' });
    render();

    expect(getText()).toContain('Página 2 de 2');
    expect(getText()).toContain('11-12 de 12');
  }));

  it('should update query params when page size changes', fakeAsync(() => {
    render();

    const select = fixture.nativeElement.querySelector('footer select') as HTMLSelectElement;
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    tick();

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { pageSize: 25, page: 1 },
      queryParamsHandling: 'merge',
    }));
  }));

  it('should navigate to detail preserving filters', fakeAsync(() => {
    setQueryParams({ query: 'Enka', page: '1' });
    render();

    const link = fixture.nativeElement.querySelector('a[title="Ver detalle"]') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toContain('/shipments/');
    expect(link.getAttribute('href')).toContain('query=Enka');
  }));

  it('should render empty state when there are no matching results', fakeAsync(() => {
    setQueryParams({ query: 'Sin coincidencias' });
    render();

    expect(getText()).toContain('No hay envíos completados para mostrar');
  }));

  it('should render error state and retry', fakeAsync(() => {
    getDeliveredSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(History);
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
    querySubject.next(convertToParamMap(params));
    tick();
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
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

function createShipments(): Shipment[] {
  const shipments: Shipment[] = [
    createShipment({ id: 'delivered-001', documentNumber: 'AWB-DEL-001', operationType: 'IMPO', transportMode: 'AIR', client: 'Enka', originCountry: 'México', destinationCountry: 'Colombia', delivery: '2026-01-10', eta: '2026-01-09' }),
    createShipment({ id: 'delivered-002', documentNumber: 'HBL-DEL-002', operationType: 'EXPO', transportMode: 'SEA', client: 'Nutresa', originCountry: 'Colombia', destinationCountry: 'Perú', delivery: '2026-02-12' }),
    createShipment({ id: 'active-003', documentNumber: 'AWB-ACT-003', operationType: 'IMPO', transportMode: 'AIR', status: 'IN_TRANSIT', client: 'Postobon', originCountry: 'Chile', destinationCountry: 'Colombia', delivery: null }),
  ];

  for (let index = 4; index <= 14; index += 1) {
    shipments.push(
      createShipment({
        id: `delivered-${index.toString().padStart(3, '0')}`,
        documentNumber: `AWB-DEL-${index.toString().padStart(3, '0')}`,
        operationType: 'IMPO',
        transportMode: 'AIR',
        client: 'Enka',
        originCountry: 'Estados Unidos',
        destinationCountry: 'Colombia',
        delivery: `2026-03-${index.toString().padStart(2, '0')}`,
      }),
    );
  }

  return shipments;
}

interface ShipmentInput {
  id: string;
  documentNumber: string;
  operationType: Shipment['operationType'];
  transportMode: Shipment['transportMode'];
  client: string;
  originCountry: string;
  destinationCountry: string;
  status?: Shipment['status'];
  delivery: string | null;
  eta?: string | null;
}

function createShipment(input: ShipmentInput): Shipment {
  return {
    id: input.id,
    documentNumber: input.documentNumber,
    operationType: input.operationType,
    transportMode: input.transportMode,
    status: input.status ?? 'DELIVERED',
    client: input.client,
    provider: 'Global Freight Logistics S.A.S.',
    incoterm: 'DAP',
    origin: { country: input.originCountry, city: input.originCountry === 'Colombia' ? 'Medellín' : null, terminal: null },
    destination: { country: input.destinationCountry, city: input.destinationCountry === 'Colombia' ? 'Bogotá' : null, terminal: null },
    merchandiseDescription: 'Textiles',
    cargoType: 'LCL',
    packages: 10,
    weightKg: 1200,
    volumeM3: 8,
    carrier: input.transportMode === 'AIR' ? 'Avianca Cargo' : 'Maersk',
    logisticDates: {
      etd: '2026-01-01',
      atd: '2026-01-02',
      eta: input.eta ?? '2026-01-09',
      ata: '2026-01-09',
      destinationWarehouse: '2026-01-08',
      dispatch: '2026-01-09',
      delivery: input.delivery,
    },
    container: input.transportMode === 'SEA' ? null : undefined,
    financialInfo: { advancePayment: null, invoice: null },
    documents: [],
    events: [],
    issue: null,
    progress: input.status === 'IN_TRANSIT' ? 45 : 100,
    nextStop: null,
  };
}
