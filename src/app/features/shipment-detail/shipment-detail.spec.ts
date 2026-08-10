import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Params, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { LogisticDates, Shipment, ShipmentFinancialInfo } from '../../core/models/shipment.model';
import { ApiHomeService } from '../../core/services/api-home.service';
import { MockShipmentService } from '../../mocks/services/mock-shipment.service';
import { ShipmentDetail } from './shipment-detail';

describe('ShipmentDetail', () => {
  let fixture: ComponentFixture<ShipmentDetail>;
  let router: Router;
  let getByIdSpy: jasmine.Spy<(id: string) => Observable<Shipment | null>>;
  let homeSearchSpy: jasmine.Spy;
  let paramSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let querySubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let clipboardWriteSpy: jasmine.Spy<(value: string) => Promise<void>>;

  beforeEach(async () => {
    paramSubject = new BehaviorSubject(convertToParamMap({ id: 'shipment-001' }));
    querySubject = new BehaviorSubject(convertToParamMap({}));
    getByIdSpy = jasmine.createSpy('getById').and.returnValue(of(createShipment()));
    homeSearchSpy = jasmine.createSpy('search').and.returnValue(
      of({
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      }),
    );
    clipboardWriteSpy = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: clipboardWriteSpy },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [ShipmentDetail, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramSubject.asObservable(),
            queryParamMap: querySubject.asObservable(),
            snapshot: { paramMap: convertToParamMap({ id: 'shipment-001' }), queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: MockShipmentService, useValue: { getById: getByIdSpy } },
        { provide: ApiHomeService, useValue: { search: homeSearchSpy } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ShipmentDetail);
  });

  it('should get shipment by route id and render header', fakeAsync(() => {
    render();

    expect(getByIdSpy).toHaveBeenCalledWith('shipment-001');
    expect(getText()).toContain('AWB-001');
    expect(getText()).toContain('En tránsito');
    expect(getText()).toContain('México');
    expect(getText()).toContain('Colombia');
  }));

  it('should render not found state', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(null));
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('Envío no encontrado');
  }));

  it('should render detail from home search when route id is not in mock data', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(null));
    homeSearchSpy.and.returnValue(
      of({
        items: [
          {
            id: '200',
            documentNumber: 'AWB-JL9TDCC5',
            operationType: 'EXPO',
            transportMode: 'SEA',
            status: 'ORIGIN_CUSTOMS',
            origin: { country: 'Colombia' },
            destination: { country: 'Alemania' },
          },
        ],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      }),
    );
    paramSubject.next(convertToParamMap({ id: '200' }));
    querySubject.next(convertToParamMap({ document: 'AWB-JL9TDCC5', from: 'dashboard' }));
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(homeSearchSpy).toHaveBeenCalledWith({ query: 'AWB-JL9TDCC5', page: 1, pageSize: 10 });
    expect(getText()).toContain('AWB-JL9TDCC5');
    expect(getText()).toContain('En Aduana origen');
    expect(getText()).toContain('Colombia');
    expect(getText()).toContain('Alemania');
  }));

  it('should render error state and retry', fakeAsync(() => {
    getByIdSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('No se pudo cargar el detalle');
    getByIdSpy.and.returnValue(of(createShipment()));
    clickButton('Reintentar');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('AWB-001');
  }));

  it('should copy document number', fakeAsync(() => {
    render();

    const button = fixture.nativeElement.querySelector('button[title="Copiar documento"]') as HTMLButtonElement;
    button.click();
    flushMicrotasks();
    fixture.detectChanges();

    expect(clipboardWriteSpy).toHaveBeenCalledWith('AWB-001');
    expect(getText()).toContain('Copiado');
  }));

  it('should change selected tab through query params', fakeAsync(() => {
    render();
    clickButton('Fechas logísticas');

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'dates' },
      queryParamsHandling: 'merge',
    }));
  }));

  it('should render selected tab from query param', fakeAsync(() => {
    setQueryParams({ tab: 'financial' });
    render();

    expect(getText()).toContain('Facturación');
    expect(getText()).toContain('Resumen');
  }));

  it('should return to list preserving listing query params', fakeAsync(() => {
    setQueryParams({ query: 'Enka', page: '2', pageSize: '25', tab: 'summary' });
    render();
    clickButton('Volver');

    expect(router.navigate).toHaveBeenCalledWith(['/shipments'], { queryParams: { query: 'Enka', page: '2', pageSize: '25' } });
  }));

  it('should return to history when detail was opened from history', fakeAsync(() => {
    setQueryParams({ from: 'history', query: 'Enka', page: '2', document: 'AWB-001', tab: 'summary' });
    render();
    clickButton('Volver');

    expect(router.navigate).toHaveBeenCalledWith(['/history'], { queryParams: { query: 'Enka', page: '2' } });
  }));

  it('should render issue only when shipment has issue', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ issue: { type: 'DELAY', comment: 'Retraso operativo.', date: '2026-01-06', resolved: false } })));
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('Retraso logístico');
    expect(getText()).toContain('Retraso operativo.');

    getByIdSpy.and.returnValue(of(createShipment({ issue: null })));
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).not.toContain('Retraso logístico');
  }));

  it('should list every logistic milestone with its date', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ logisticDates: { etd: '2026-01-01', atd: '2026-01-03', eta: '2026-01-05', ata: null } })));
    setQueryParams({ tab: 'dates' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    const text = getText();

    expect(text).toContain('Línea de tiempo logística');
    expect(text).toContain('ETD (Salida estimada)');
    expect(text).toContain('ATA (Llegada real)');
    expect(text).toContain('Entrega contenedor');
    expect(text).not.toContain('Retrasado');
  }));

  it('should show the container card with placeholders when there is no container data', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ transportMode: 'AIR', container: undefined })));
    setQueryParams({ tab: 'container' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    const text = getText();

    expect(text).toContain('Información de contenedor');
    expect(text).toContain('Días restantes para entrega');
    expect(text).toContain('Depósito contenedor');
    expect(text).toContain('No disponible');
  }));

  it('should show the financial cards with placeholders when financial data is absent', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ financialInfo: { advancePayment: null, invoice: null } })));
    setQueryParams({ tab: 'financial' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    const text = getText();

    expect(text).toContain('Anticipo');
    expect(text).toContain('Facturación');
    expect(text).toContain('Fecha solicitud anticipo');
    expect(text).toContain('Subtotal factura');
    expect(text).toContain('Total factura');
    expect(text).toContain('Descripción gasto');
    expect(text).toContain('No disponible');
  }));

  it('should render currency format consistently', fakeAsync(() => {
    setQueryParams({ tab: 'financial' });
    render();

    expect(getText()).toContain('USD 1.980');
    expect(getText()).toContain('USD 1.200');
  }));

  it('should calculate tracking progress and active stage', fakeAsync(() => {
    getByIdSpy.and.returnValue(
      of(
        createShipment({
          status: 'IN_TRANSIT',
          events: [{ id: 'event-1', dateTime: '2026-01-02T08:30:00.000Z', status: 'IN_TRANSIT', location: { country: 'México' }, description: 'Salida.', source: 'Mock' }],
        }),
      ),
    );
    setQueryParams({ tab: 'tracking' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    const progress = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    const currentStage = fixture.nativeElement.querySelector('.tracking-stages__item--current') as HTMLElement;

    expect(progress.getAttribute('aria-valuenow')).toBe('50');
    expect(currentStage.textContent).toContain('En tránsito');
    expect(currentStage.textContent).toContain('Ahora');
    expect(currentStage.querySelector('.tracking-stages__badge mat-icon')?.textContent?.trim()).toBe('flight');
  }));

  it('should calculate next stop from logistic dates and destination', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ status: 'IN_TRANSIT', logisticDates: { eta: '2026-01-05' } })));
    setQueryParams({ tab: 'tracking' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('Bogotá, Colombia');
    expect(getText()).toContain('05 de ene de 2026');
  }));

  it('should render delivered tracking as complete without next stop', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ status: 'DELIVERED', logisticDates: { delivery: '2026-01-10' } })));
    setQueryParams({ tab: 'tracking' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('100%');
    expect(getText()).toContain('No hay próxima parada para este estado.');
  }));

  it('should render coordinate fallback when coordinates are absent', fakeAsync(() => {
    getByIdSpy.and.returnValue(
      of(
        createShipment({
          origin: { country: 'España', city: 'Madrid', terminal: null },
          destination: { country: 'Colombia', city: 'Bogotá', terminal: null, latitude: 4.711, longitude: -74.0721 },
        }),
      ),
    );
    setQueryParams({ tab: 'tracking' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('Mapa no disponible');
    expect(getText()).toContain('No hay coordenadas suficientes');
  }));

  it('should describe the tracking route on the map and its endpoints', fakeAsync(() => {
    setQueryParams({ tab: 'tracking' });
    render();

    const map = fixture.nativeElement.querySelector('.tracking-map') as HTMLElement;
    const endpoints = fixture.nativeElement.querySelector('.tracking-progress-card__endpoints') as HTMLElement;

    expect(map.getAttribute('aria-label')).toContain('Envío desde Ciudad de México, México hacia Bogotá, Colombia');
    expect(endpoints.textContent).toContain('Ciudad de México, México');
    expect(endpoints.textContent).toContain('Bogotá, Colombia');
    expect(getText()).toContain('Ubicación simulada para fines del prototipo.');
  }));

  it('should fall back to the summary tab when an unknown tab is requested', fakeAsync(() => {
    setQueryParams({ tab: 'documents' });
    render();

    expect(getText()).toContain('Información del envío');
  }));

  it('should render history newest first and allow order change', fakeAsync(() => {
    setQueryParams({ tab: 'history' });
    render();

    const initialText = getText();
    expect(initialText.indexOf('Entrega final')).toBeLessThan(initialText.indexOf('Ingreso a bodega'));

    clickButton('Cambiar orden');
    fixture.detectChanges();

    const updatedText = getText();
    expect(updatedText).toContain('Más antiguo primero');
    expect(updatedText.indexOf('Ingreso a bodega')).toBeLessThan(updatedText.indexOf('Entrega final'));
  }));

  it('should render empty history state', fakeAsync(() => {
    getByIdSpy.and.returnValue(of(createShipment({ events: [] })));
    setQueryParams({ tab: 'history' });
    fixture = TestBed.createComponent(ShipmentDetail);
    render();

    expect(getText()).toContain('Sin eventos registrados.');
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

interface ShipmentInput extends Partial<Omit<Shipment, 'logisticDates' | 'financialInfo'>> {
  logisticDates?: Partial<LogisticDates>;
  financialInfo?: ShipmentFinancialInfo;
}

function createShipment(input: ShipmentInput = {}): Shipment {
  return {
    id: 'shipment-001',
    documentNumber: 'AWB-001',
    operationType: 'IMPO',
    transportMode: 'AIR',
    status: 'IN_TRANSIT',
    client: 'Enka',
    provider: 'Global Freight Logistics S.A.S.',
    incoterm: 'DAP',
    origin: { country: 'México', city: 'Ciudad de México', terminal: null, latitude: 19.4326, longitude: -99.1332 },
    destination: { country: 'Colombia', city: 'Bogotá', terminal: null, latitude: 4.711, longitude: -74.0721 },
    merchandiseDescription: 'Textiles',
    cargoType: 'LCL',
    packages: 12,
    weightKg: 450,
    volumeM3: 7.5,
    carrier: 'Avianca Cargo',
    logisticDates: {
      originWarehouse: '2026-01-01',
      etd: '2026-01-02',
      atd: '2026-01-02',
      eta: '2026-01-05',
      ata: '2026-01-05',
      destinationWarehouse: '2026-01-06',
      nationalization: '2026-01-07',
      dispatch: '2026-01-08',
      planilla: '2026-01-09',
      delivery: null,
      ...input.logisticDates,
    },
    container: undefined,
    financialInfo: input.financialInfo ?? {
      advancePayment: { requestedAt: '2026-01-01', paidAt: '2026-01-02', amount: 1200 },
      invoice: {
        providerInvoice: 'FP-001',
        tccInvoice: 'FT-001',
        invoiceNumber: 'FAC-001',
        invoiceDate: '2026-01-10',
        expenseDescription: 'Flete internacional',
        expenseValue: 1500,
        subtotal: 1980,
        tax: 376.2,
        total: 2356.2,
      },
    },
    events: [
      {
        id: 'shipment-001-event-1',
        dateTime: '2026-01-01T08:30:00.000Z',
        status: 'PENDING',
        location: { country: 'México', city: 'Ciudad de México' },
        description: 'Ingreso a bodega de origen.',
        source: 'Sistema mock Conexion360',
        user: null,
      },
      {
        id: 'shipment-001-event-2',
        dateTime: '2026-01-05T09:30:00.000Z',
        status: 'DELIVERED',
        location: { country: 'Colombia', city: 'Bogotá' },
        description: 'Entrega final completada.',
        source: 'Sistema mock Conexion360',
        user: 'Equipo operaciones',
      },
    ],
    issue: null,
    progress: 50,
    nextStop: 'Aduana destino',
    ...input,
  };
}
