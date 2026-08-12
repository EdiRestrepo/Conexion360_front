import { AsyncPipe } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Observable, Subject, catchError, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';

import { ReportMetrics, ShipmentStatus } from '../../core/models/shipment.model';
import { SHIPMENT_DATA_SOURCE } from '../../core/contracts/shipment-data-source';
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
  imports: [AsyncPipe, MatButtonModule, MatIconModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports implements AfterViewChecked, OnDestroy {
  @ViewChildren('chartCanvas') private readonly chartCanvases?: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly shipmentService = inject(SHIPMENT_DATA_SOURCE);
  private readonly retry$ = new Subject<void>();
  private readonly currentViewModel = signal<ReportsViewModel>(initialViewModel);
  private readonly charts = new Map<string, Chart>();
  private chartKey = '';

  protected readonly exportMessage = signal<string | null>(null);
  protected readonly viewModel$: Observable<ReportsViewModel> = this.retry$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.shipmentService.getReportMetrics().pipe(
        map((metrics) => this.createViewModel(metrics)),
        startWith(initialViewModel),
        catchError(() =>
          of({
            ...initialViewModel,
            state: 'error',
            message: 'No fue posible cargar los reportes. Intenta nuevamente.',
          } satisfies ReportsViewModel),
        ),
      ),
    ),
    tap((viewModel) => this.currentViewModel.set(viewModel)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

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

  protected retry(): void {
    this.retry$.next();
  }

  protected exportCsv(metrics: ReportMetrics): void {
    const rows = [
      ['categoria', 'indicador', 'valor'],
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
    link.download = 'conexion360-reporte-prototipo.csv';
    link.click();
    globalThis.URL.revokeObjectURL(url);
    this.exportMessage.set('Exportación generada con datos simulados del prototipo.');
  }

  private createViewModel(metrics: ReportMetrics): ReportsViewModel {
    if (metrics.totalShipments === 0) {
      return {
        ...initialViewModel,
        state: 'empty',
        message: 'No hay datos simulados suficientes para construir reportes.',
      };
    }

    return {
      state: 'success',
      metrics,
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
      charts: this.createCharts(metrics),
      statusBreakdown: this.createStatusBreakdown(metrics),
      topRoutes: metrics.topRoutes.map((route) => ({ label: route.route, value: route.total })),
    };
  }

  private createCharts(metrics: ReportMetrics): ReportChart[] {
    return [
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
      {
        id: 'clients',
        title: 'Top clientes por cantidad de envíos',
        kind: 'bar',
        values: metrics.topClients.map((client) => ({ label: client.client, value: client.total })),
        summary: metrics.topClients.map((client) => `${client.client}: ${client.total}`).join('. '),
      },
    ];
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
