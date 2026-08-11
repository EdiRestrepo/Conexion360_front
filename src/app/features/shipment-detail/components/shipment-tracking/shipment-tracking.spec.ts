import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogisticDates, Shipment, ShipmentFinancialInfo } from '../../../../core/models/shipment.model';
import { ShipmentTracking } from './shipment-tracking';

describe('ShipmentTracking', () => {
  let fixture: ComponentFixture<ShipmentTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ShipmentTracking] }).compileComponents();
    fixture = TestBed.createComponent(ShipmentTracking);
  });

  it('should render the five logistic stages with mode aware icons', () => {
    render(createShipment());

    const stages = Array.from(fixture.nativeElement.querySelectorAll('.tracking-stages__item')) as HTMLElement[];
    const icons = stages.map((stage) => stage.querySelector('.tracking-stages__badge mat-icon')?.textContent?.trim());

    expect(stages.length).toBe(5);
    expect(stages.map((stage) => stage.querySelector('.tracking-stages__label')?.textContent?.trim())).toEqual([
      'Pendiente',
      'Aduana origen',
      'En tránsito',
      'Aduana destino',
      'Entregado',
    ]);
    expect(icons).toEqual(['inventory_2', 'account_balance', 'flight', 'account_balance', 'check_circle']);
  });

  it('should use the sea icon for maritime shipments', () => {
    render(createShipment({ transportMode: 'SEA' }));

    const transitIcon = fixture.nativeElement.querySelectorAll('.tracking-stages__badge mat-icon')[2] as HTMLElement;

    expect(transitIcon.textContent?.trim()).toBe('directions_boat');
  });

  it('should mark the current stage and show progress endpoints', () => {
    render(createShipment());

    const current = fixture.nativeElement.querySelector('.tracking-stages__item--current') as HTMLElement;
    const progress = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    const endpoints = fixture.nativeElement.querySelector('.tracking-progress-card__endpoints') as HTMLElement;

    expect(current.textContent).toContain('En tránsito');
    expect(current.textContent).toContain('Ahora');
    expect(progress.getAttribute('aria-valuenow')).toBe('50');
    expect(endpoints.textContent).toContain('Ciudad de México, México');
    expect(endpoints.textContent).toContain('Bogotá, Colombia');
  });

  it('should complete every stage when delivered', () => {
    render(createShipment({ status: 'DELIVERED' }));

    const completed = fixture.nativeElement.querySelectorAll('.tracking-stages__item--completed');

    expect(completed.length).toBe(5);
    expect(fixture.nativeElement.querySelector('.tracking-stages__item--current')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('100%');
  });

  it('should not render the next stop block', () => {
    render(createShipment());

    expect(fixture.nativeElement.querySelector('.tracking-next-stop')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Próxima parada');
  });

  it('should keep the current stage on the shipment status even when events went further', () => {
    render(createShipment({ status: 'ORIGIN_CUSTOMS' }));

    const current = fixture.nativeElement.querySelector('.tracking-stages__item--current') as HTMLElement;
    const progress = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;

    expect(current.textContent).toContain('Aduana origen');
    expect(current.textContent).not.toContain('En tránsito');
    expect(progress.getAttribute('aria-valuenow')).toBe('25');
  });

  it('should place a shipment with an issue on the furthest stage of its change log', () => {
    render(createShipment({ status: 'WITH_ISSUE' }));

    const current = fixture.nativeElement.querySelector('.tracking-stages__item--current') as HTMLElement;

    expect(current.textContent).toContain('En tránsito');
  });

  it('should fall back to the textual summary without coordinates', () => {
    render(createShipment({ origin: { country: 'México', city: 'Ciudad de México' } }));

    expect(fixture.nativeElement.querySelector('.tracking-map')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Mapa no disponible');
    expect(fixture.nativeElement.textContent).toContain('Envío desde Ciudad de México, México hacia Bogotá, Colombia');
  });

  it('should describe the route on the map for screen readers', () => {
    render(createShipment());

    const map = fixture.nativeElement.querySelector('.tracking-map') as HTMLElement;

    expect(map.getAttribute('aria-label')).toContain('Envío desde Ciudad de México, México hacia Bogotá, Colombia');
  });

  function render(shipment: Shipment): void {
    fixture.componentRef.setInput('shipment', shipment);
    fixture.detectChanges();
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
    logisticDates: { etd: '2026-01-02', eta: '2026-01-05', ...input.logisticDates },
    container: undefined,
    financialInfo: input.financialInfo ?? { advancePayment: null, invoice: null },
    events: [
      {
        id: 'shipment-001-event-1',
        dateTime: '2026-01-02T08:30:00.000Z',
        status: 'IN_TRANSIT',
        location: { country: 'México', city: 'Ciudad de México' },
        description: 'Salida del país de origen.',
        source: 'Sistema mock Conexion360',
        user: null,
      },
    ],
    issue: null,
    progress: 50,
    nextStop: 'Aduana destino',
    ...input,
  };
}
