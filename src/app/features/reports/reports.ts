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
import {
  getOperationTypeLabel,
  getShipmentStatusLabel,
  getTransportModeLabel,
} from '../../core/utils/display-labels';
import { MockShipmentService } from '../../mocks/services/mock-shipment.service';
import type { ChartKind, ChartValue, MetricCard, ReportChart, ReportsState, ReportsViewModel } from './models/reports-view.model';

const initialViewModel: ReportsViewModel = {
  state: 'loading',
  metrics: null,
  indicators: [],
  financials: [],
  charts: [],
};

const chartColors = ['#12355B', '#00B8A9', '#F97316', '#22C55E', '#334155', '#0F172A', '#93C5FD', '#FED7AA', '#BBF7D0'];

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

  private readonly shipmentService = inject(MockShipmentService);
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
        { label: 'Entregados', value: metrics.totalDelivered.toLocaleString('es-CO'), icon: 'task_alt' },
        { label: 'Con novedad', value: metrics.totalWithIssue.toLocaleString('es-CO'), icon: 'warning' },
      ],
      financials: [
        { label: 'Total facturado', value: this.formatCurrency(metrics.totalBilledUsd), icon: 'payments' },
        { label: 'Total anticipos', value: this.formatCurrency(metrics.totalAdvancesUsd), icon: 'request_quote' },
        { label: 'Total demoras', value: this.formatCurrency(metrics.totalDelayUsd), icon: 'timer' },
      ],
      charts: this.createCharts(metrics),
    };
  }

  private createCharts(metrics: ReportMetrics): ReportChart[] {
    return [
      {
        id: 'operation',
        title: 'Por tipo de operación',
        kind: 'doughnut',
        values: [
          { label: getOperationTypeLabel('IMPO'), value: metrics.byOperationType.IMPO },
          { label: getOperationTypeLabel('EXPO'), value: metrics.byOperationType.EXPO },
        ],
        summary: `Importaciones: ${metrics.byOperationType.IMPO}. Exportaciones: ${metrics.byOperationType.EXPO}.`,
      },
      {
        id: 'mode',
        title: 'Por modalidad',
        kind: 'doughnut',
        values: [
          { label: getTransportModeLabel('AIR'), value: metrics.byTransportMode.AIR },
          { label: getTransportModeLabel('SEA'), value: metrics.byTransportMode.SEA },
        ],
        summary: `Aéreos: ${metrics.byTransportMode.AIR}. Marítimos: ${metrics.byTransportMode.SEA}.`,
      },
      {
        id: 'status',
        title: 'Por estado',
        kind: 'bar',
        values: Object.entries(metrics.byStatus)
          .filter(([, value]) => value > 0)
          .map(([status, value]) => ({ label: getShipmentStatusLabel(status as ShipmentStatus), value })),
        summary: `Distribución por estados con ${metrics.totalShipments} envíos simulados.`,
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

  private createChartConfig(reportChart: ReportChart): ChartConfiguration<ChartKind, number[], string> {
    const labels = reportChart.values.map((value) => value.label);
    const data = reportChart.values.map((value) => value.value);

    return {
      type: reportChart.kind,
      data: {
        labels,
        datasets: [
          {
            label: reportChart.title,
            data,
            backgroundColor: chartColors.slice(0, data.length),
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          title: { display: false },
        },
        scales: reportChart.kind === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : undefined,
      },
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
    this.chartKey = '';
  }
}
