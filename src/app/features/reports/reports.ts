import { AsyncPipe } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { ReportMetrics, ShipmentStatus } from '../../core/models/shipment.model';
import { UserRole } from '../../core/models/user.model';
import { SHIPMENT_DATA_SOURCE } from '../../core/contracts/shipment-data-source';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { ViewPdfExportService } from '../../core/services/view-pdf-export.service';
import { getApiErrorMessage } from '../../core/utils/api-error';
import { getVisibleErrorMessage } from '../../core/utils/input-error-message';
import { inputRules } from '../../core/utils/input-rules';
import { validatorsFor } from '../../core/utils/input-validators';
import {
  getOperationTypeLabel,
  getShipmentStatusLabel,
  getTransportModeIcon,
  getTransportModeLabel,
} from '../../core/utils/display-labels';
import type { ChartKind, ChartValue, MetricCard, ReportChart, ReportsState, ReportsViewModel, StatusBreakdownItem } from './models/reports-view.model';

const initialViewModel: ReportsViewModel = {
  state: 'loading',
  metrics: null,
  indicators: [],
  financials: [],
  charts: [],
  statusBreakdown: [],
  topRoutes: [],
};

const chartBlueDark = '#1D4ED8';
const chartBlueLight = '#60A5FA';
const chartTeal = '#00B8A9';
const chartPurple = '#8B5CF6';
/**
 * Roles internos de TCC: ven el ranking de clientes y pueden filtrar el reporte
 * por cliente.
 *
 * `CLIENT` queda fuera a propósito: la tarjeta lista **otros** clientes por
 * nombre, y un cliente no debe ver la operación de sus pares. Es una lista de
 * permitidos, así que un rol nuevo de Auth0 no ve nada de esto hasta agregarlo
 * aquí. Ojo: esto solo oculta la interfaz. Qué clientes puede consultar cada
 * analista lo decide el backend (`ClientAccessResolver`); cuando `GET
 * /reports/home` empiece a devolver `topClients`, debe filtrarlo también por rol.
 */
const internalRoles: UserRole[] = ['ADMIN', 'ANALISTAOPE', 'ANALISTASAC'];
const statusRowPalette = [
  'status-row--gray',
  'status-row--blue',
  'status-row--green',
  'status-row--purple',
  'status-row--orange',
  'status-row--teal',
];

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatMenuModule, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports implements AfterViewChecked, OnDestroy {
  @ViewChildren('chartCanvas') private readonly chartCanvases?: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('reportCapture') private readonly reportCapture?: ElementRef<HTMLElement>;

  private readonly shipmentService = inject(SHIPMENT_DATA_SOURCE);
  private readonly authSession = inject(AuthSessionService);
  private readonly pdfExport = inject(ViewPdfExportService);
  /** Documento del cliente consultado; vacío es el reporte sin filtrar. */
  private readonly clientQuery$ = new BehaviorSubject<string>('');
  private readonly currentViewModel = signal<ReportsViewModel>(initialViewModel);
  private readonly charts = new Map<string, Chart>();
  private chartKey = '';

  protected readonly exportMessage = signal<string | null>(null);
  protected readonly exportingPdf = signal(false);
  protected readonly documentRule = inputRules.documentFilter;
  protected readonly clientControl = new FormControl('', { nonNullable: true, validators: validatorsFor(this.documentRule) });
  protected readonly appliedClient = signal('');
  protected readonly canFilterByClient = computed(() => this.isInternalRole());
  protected readonly viewModel$: Observable<ReportsViewModel> = this.clientQuery$.pipe(
    switchMap((clientId) =>
      this.shipmentService.getReportMetrics(clientId).pipe(
        map((metrics) => this.createViewModel(metrics, clientId)),
        startWith(initialViewModel),
        catchError((error: unknown) =>
          of({
            ...initialViewModel,
            state: 'error',
            // El motivo del backend importa aquí: «No hay clientes asignados.» es
            // la respuesta cuando un analista consulta un cliente que no es suyo.
            message: getApiErrorMessage(
              error,
              clientId ? `No fue posible consultar el reporte del cliente ${clientId}.` : 'No fue posible cargar los reportes.',
            ),
          } satisfies ReportsViewModel),
        ),
      ),
    ),
    tap((viewModel) => this.currentViewModel.set(viewModel)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    // Igual que los buscadores de Mis envíos e Historial: se consulta mientras se
    // escribe, y un valor inválido (incompleto o malicioso) no llega al backend.
    // Vaciar el campo vuelve al reporte sin filtrar.
    this.clientControl.valueChanges
      .pipe(
        debounceTime(250),
        filter(() => this.clientControl.valid),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((clientId) => this.applyClient(clientId));
  }

  ngAfterViewChecked(): void {
    const viewModel = this.currentViewModel();
    const canvases = this.chartCanvases?.toArray() ?? [];

    if (viewModel.state !== 'success' || !viewModel.metrics || canvases.length === 0) {
      this.destroyCharts();
      return;
    }

    const nextKey = viewModel.charts.map((chart) => `${chart.id}:${chart.values.map((value) => value.value).join(',')}`).join('|');
    if (this.chartKey === nextKey) {
      return;
    }

    this.destroyCharts();
    viewModel.charts.forEach((chart, index) => {
      const canvas = canvases[index]?.nativeElement;
      if (canvas) {
        this.charts.set(chart.id, new Chart(canvas, this.createChartConfig(chart)));
      }
    });
    this.chartKey = nextKey;
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  protected get clientError(): string | null {
    return getVisibleErrorMessage(this.clientControl, this.documentRule);
  }

  protected retry(): void {
    this.clientQuery$.next(this.clientQuery$.value);
  }

  protected exportCsv(metrics: ReportMetrics): void {
    const rows = [
      ['categoria', 'indicador', 'valor'],
      ...(this.appliedClient() ? [['filtro', 'cliente', this.appliedClient()]] : []),
      ['general', 'total_envios', metrics.totalShipments.toString()],
      ['general', 'entregados', metrics.totalDelivered.toString()],
      ['general', 'con_novedad', metrics.totalWithIssue.toString()],
      ['financiero', 'total_facturado_usd', metrics.totalBilledUsd.toString()],
      ['financiero', 'total_anticipos_usd', metrics.totalAdvancesUsd.toString()],
      ['financiero', 'total_demoras_usd', metrics.totalDelayUsd.toString()],
      ...Object.entries(metrics.byOperationType).map(([key, value]) => ['operacion', key, value.toString()]),
      ...Object.entries(metrics.byTransportMode).map(([key, value]) => ['modalidad', key, value.toString()]),
      ...Object.entries(metrics.byStatus).map(([key, value]) => ['estado', key, value.toString()]),
      ...metrics.topClients.map((client) => ['cliente', client.client, client.total.toString()]),
      ...metrics.topRoutes.map((route) => ['ruta', route.route, route.total.toString()]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');

    link.href = url;
    link.download = 'conexion360-reportes.csv';
    link.click();
    globalThis.URL.revokeObjectURL(url);
    this.exportMessage.set('Exportación generada con los indicadores en pantalla.');
  }

  protected async exportPdf(): Promise<void> {
    const element = this.reportCapture?.nativeElement;
    if (!element || this.exportingPdf()) {
      return;
    }

    this.exportingPdf.set(true);
    this.exportMessage.set(null);
    try {
      await this.pdfExport.exportElement(element, 'conexion360-reportes.pdf');
      this.exportMessage.set('PDF generado con la vista actual de reportes.');
    } catch {
      this.exportMessage.set('No fue posible generar el PDF. Intenta nuevamente.');
    } finally {
      this.exportingPdf.set(false);
    }
  }

  private applyClient(clientId: string): void {
    this.exportMessage.set(null);
    this.appliedClient.set(clientId);
    this.clientQuery$.next(clientId);
  }

  private createViewModel(metrics: ReportMetrics, clientId: string): ReportsViewModel {
    if (metrics.totalShipments === 0) {
      return {
        ...initialViewModel,
        state: 'empty',
        message: clientId
          ? `El cliente ${clientId} no tiene envíos registrados.`
          : 'Todavía no hay envíos registrados para construir reportes.',
      };
    }

    // Se vacía `topClients` en un solo punto —y no solo al pintar el gráfico—
    // para que el CSV exportado tampoco lleve el ranking. Filtrado por un
    // cliente, un ranking de clientes no tiene sentido.
    const visibleMetrics = this.isInternalRole() && !clientId ? metrics : { ...metrics, topClients: [] };

    return {
      state: 'success',
      metrics: visibleMetrics,
      indicators: [
        { label: 'Total de envíos', value: metrics.totalShipments.toLocaleString('es-CO'), icon: 'inventory_2' },
        {
          label: 'Entregados',
          value: metrics.totalDelivered.toLocaleString('es-CO'),
          icon: 'task_alt',
          caption: `${this.formatShare(metrics.totalDelivered, metrics.totalShipments)}% del total`,
        },
        {
          label: 'Con novedad',
          value: metrics.totalWithIssue.toLocaleString('es-CO'),
          icon: 'warning',
          caption: `${this.formatShare(metrics.totalWithIssue, metrics.totalShipments)}% del total`,
        },
      ],
      financials: [
        { label: 'Total facturado', value: this.formatCurrency(metrics.totalBilledUsd), icon: 'payments' },
        { label: 'Total anticipos', value: this.formatCurrency(metrics.totalAdvancesUsd), icon: 'request_quote' },
        { label: 'Total demoras', value: this.formatCurrency(metrics.totalDelayUsd), icon: 'timer' },
      ],
      charts: this.createCharts(visibleMetrics),
      statusBreakdown: this.createStatusBreakdown(metrics),
      topRoutes: metrics.topRoutes.map((route) => ({ label: route.route, value: route.total })),
    };
  }

  /**
   * Se lee el rol de la sesión ya resuelta: el servicio de reportes espera a
   * que Auth0 emita la identidad antes de pedir los datos, así que aquí la
   * sesión siempre está disponible. Sin rol conocido, no se muestra el ranking.
   */
  private isInternalRole(): boolean {
    const role = this.authSession.currentSession()?.user.role ?? null;

    return role !== null && internalRoles.includes(role);
  }

  private createCharts(metrics: ReportMetrics): ReportChart[] {
    const charts: ReportChart[] = [
      {
        id: 'operation',
        title: 'Por tipo de operación',
        kind: 'doughnut',
        values: [
          { label: getOperationTypeLabel('EXPO'), value: metrics.byOperationType.EXPO, icon: 'north_east' },
          { label: getOperationTypeLabel('IMPO'), value: metrics.byOperationType.IMPO, icon: 'south_west' },
        ],
        summary: `Importaciones: ${metrics.byOperationType.IMPO}. Exportaciones: ${metrics.byOperationType.EXPO}.`,
      },
      {
        id: 'mode',
        title: 'Por modalidad',
        kind: 'doughnut',
        values: [
          { label: getTransportModeLabel('AIR'), value: metrics.byTransportMode.AIR, icon: getTransportModeIcon('AIR') },
          { label: getTransportModeLabel('SEA'), value: metrics.byTransportMode.SEA, icon: getTransportModeIcon('SEA') },
        ],
        summary: `Aéreos: ${metrics.byTransportMode.AIR}. Marítimos: ${metrics.byTransportMode.SEA}.`,
      },
    ];

    // Sin ranking —porque el rol no puede verlo, o porque el backend todavía no
    // lo devuelve— se omite la tarjeta en vez de pintar un gráfico vacío.
    if (metrics.topClients.length > 0) {
      charts.push({
        id: 'clients',
        title: 'Top clientes por cantidad de envíos',
        kind: 'bar',
        values: metrics.topClients.map((client) => ({ label: client.client, value: client.total })),
        summary: metrics.topClients.map((client) => `${client.client}: ${client.total}`).join('. '),
      });
    }

    return charts;
  }

  private createStatusBreakdown(metrics: ReportMetrics): StatusBreakdownItem[] {
    const entries = Object.entries(metrics.byStatus).filter(([, value]) => value > 0) as [ShipmentStatus, number][];
    const maxValue = Math.max(...entries.map(([, value]) => value), 1);

    return entries.map(([status, value], index) => ({
      label: getShipmentStatusLabel(status),
      value,
      percentage: (value / maxValue) * 100,
      toneClass: statusRowPalette[index % statusRowPalette.length],
    }));
  }

  private createChartConfig(reportChart: ReportChart): ChartConfiguration<ChartKind, number[], string> {
    const labels = reportChart.values.map((value) => value.label);
    const data = reportChart.values.map((value) => value.value);
    const isHorizontalBar = reportChart.id === 'clients';
    const backgroundColor = this.getChartColors(reportChart.id, data.length);

    return {
      type: reportChart.kind,
      data: {
        labels,
        datasets: [
          {
            label: reportChart.title,
            data,
            backgroundColor,
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        indexAxis: isHorizontalBar ? 'y' : 'x',
        cutout: reportChart.kind === 'doughnut' ? '72%' : undefined,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: isHorizontalBar ? { x: { beginAtZero: true, ticks: { precision: 0 } } } : undefined,
      },
    };
  }

  private getChartColors(chartId: string, count: number): string[] {
    if (chartId === 'operation') {
      return [chartBlueDark, chartBlueLight];
    }

    if (chartId === 'mode') {
      return [chartTeal, chartPurple];
    }

    return new Array(count).fill(chartTeal);
  }

  private formatCurrency(value: number): string {
    return `USD ${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatShare(value: number, total: number): string {
    return total > 0 ? Math.round((value / total) * 100).toString() : '0';
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
    this.chartKey = '';
  }
}
