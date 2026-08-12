import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';

import { ReportMetrics } from '../../core/models/shipment.model';
import { SHIPMENT_DATA_SOURCE } from '../../core/contracts/shipment-data-source';
import { Reports } from './reports';

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let getReportMetricsSpy: jasmine.Spy<() => Observable<ReportMetrics>>;

  beforeEach(async () => {
    getReportMetricsSpy = jasmine.createSpy('getReportMetrics').and.returnValue(of(createReportMetrics()));

    await TestBed.configureTestingModule({
      imports: [Reports, NoopAnimationsModule],
      providers: [{ provide: SHIPMENT_DATA_SOURCE, useValue: { getReportMetrics: getReportMetricsSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
  });

  it('should render logistics metrics', fakeAsync(() => {
    render();

    expect(getText()).toContain('Total de envíos');
    expect(getText()).toContain('30');
    expect(getText()).toContain('Entregados');
    expect(getText()).toContain('6');
    expect(getText()).toContain('Con novedad');
    expect(getText()).toContain('5');
  }));

  it('should render financial totals with currency format', fakeAsync(() => {
    render();

    expect(getText()).toContain('USD');
    expect(getText()).toContain('Total facturado');
    expect(getText()).toContain('Total anticipos');
    expect(getText()).toContain('Total demoras');
  }));

  it('should render operation, mode, status and top client groupings', fakeAsync(() => {
    render();

    const text = getText();

    expect(text).toContain('Por tipo de operación');
    expect(text).toContain('Importación');
    expect(text).toContain('Exportación');
    expect(text).toContain('Por modalidad');
    expect(text).toContain('Aéreo');
    expect(text).toContain('Marítimo');
    expect(text).toContain('Por estado');
    expect(text).toContain('En tránsito');
    expect(text).toContain('Top clientes por cantidad de envíos');
  }));

  it('should render accessible textual summaries for charts', fakeAsync(() => {
    render();

    const charts = fixture.nativeElement.querySelectorAll('canvas[role="img"]') as NodeListOf<HTMLCanvasElement>;

    expect(charts.length).toBe(3);
    expect(charts[0].getAttribute('aria-label')).toContain('Importaciones: 15');
    expect(charts[1].getAttribute('aria-label')).toContain('Aéreos: 12');
    expect(charts[2].getAttribute('aria-label')).toContain('Enka');
  }));

  it('should render the most frequent routes', fakeAsync(() => {
    render();

    const text = getText();

    expect(text).toContain('Rutas más frecuentes');
    expect(text).toContain('Colombia → Brasil');
    expect(text).toContain('44');
  }));

  it('should render empty state when dataset is empty', fakeAsync(() => {
    getReportMetricsSpy.and.returnValue(of(createEmptyMetrics()));
    fixture = TestBed.createComponent(Reports);
    render();

    expect(getText()).toContain('Sin datos para reportar');
  }));

  it('should export CSV with non sensitive simulated data message', fakeAsync(() => {
    const createObjectUrlSpy = spyOn(globalThis.URL, 'createObjectURL').and.returnValue('blob:conexion360-report');
    const revokeObjectUrlSpy = spyOn(globalThis.URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    render();

    clickButton('Exportar');
    fixture.detectChanges();

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:conexion360-report');
    expect(getText()).toContain('Exportación generada con datos simulados del prototipo.');
  }));

  it('should render error state and retry', fakeAsync(() => {
    getReportMetricsSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(Reports);
    render();

    expect(getText()).toContain('No se pudieron cargar los reportes');

    getReportMetricsSpy.and.returnValue(of(createReportMetrics()));
    clickButton('Reintentar');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('Total de envíos');
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

function createReportMetrics(): ReportMetrics {
  return {
    ...createEmptyMetrics(),
    totalShipments: 30,
    totalImports: 15,
    totalExports: 15,
    totalAir: 12,
    totalSea: 18,
    totalDelivered: 6,
    totalWithIssue: 5,
    totalActive: 23,
    totalPending: 2,
    totalBilledUsd: 12500,
    totalAdvancesUsd: 3200,
    totalDelayUsd: 780,
    averageProgress: 62,
    byOperationType: { IMPO: 15, EXPO: 15 },
    byTransportMode: { AIR: 12, SEA: 18 },
    byStatus: {
      PENDING: 2,
      ORIGIN_CUSTOMS: 2,
      IN_TRANSIT: 3,
      DESTINATION_CUSTOMS: 10,
      DELIVERED: 6,
      WITH_ISSUE: 7,
    },
    topClients: [
      { client: 'Enka', total: 8 },
      { client: 'Nutresa', total: 6 },
    ],
    topRoutes: [
      { route: 'Colombia → Brasil', total: 44 },
      { route: 'Perú → Colombia', total: 38 },
    ],
  };
}

function createEmptyMetrics(): ReportMetrics {
  return {
    totalShipments: 0,
    totalImports: 0,
    totalExports: 0,
    totalAir: 0,
    totalSea: 0,
    totalDelivered: 0,
    totalWithIssue: 0,
    totalActive: 0,
    totalPending: 0,
    totalBilledUsd: 0,
    totalAdvancesUsd: 0,
    totalDelayUsd: 0,
    averageProgress: 0,
    byOperationType: { IMPO: 0, EXPO: 0 },
    byTransportMode: { AIR: 0, SEA: 0 },
    byStatus: {
      PENDING: 0,
      ORIGIN_CUSTOMS: 0,
      IN_TRANSIT: 0,
      DESTINATION_CUSTOMS: 0,
      DELIVERED: 0,
      WITH_ISSUE: 0,
    },
    topClients: [],
    topRoutes: [],
  };
}
