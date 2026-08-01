import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, forkJoin, map, of, startWith, take } from 'rxjs';

import { DashboardMetrics } from '../../core/models/shipment.model';
import { ApiHomeService, HomeShipmentSummary } from '../../core/services/api-home.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import {
  getOperationTypeLabel,
  getShipmentStatusLabel,
  getTransportModeIcon,
  getTransportModeLabel,
} from '../../core/utils/display-labels';

interface MetricCard {
  label: string;
  value: number;
  icon: string;
  detail: string;
  tone: 'primary' | 'secondary' | 'success' | 'warning';
}

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

interface DashboardViewModel {
  state: 'loading' | 'empty' | 'error' | 'success';
  metrics: DashboardMetrics | null;
  recentShipments: HomeShipmentSummary[];
  cards: MetricCard[];
  operationDistribution: DistributionItem[];
  modeDistribution: DistributionItem[];
  message?: string;
}

const initialViewModel: DashboardViewModel = {
  state: 'loading',
  metrics: null,
  recentShipments: [],
  cards: [],
  operationDistribution: [],
  modeDistribution: [],
};

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authSession = inject(AuthSessionService);
  private readonly shipmentService = inject(ApiHomeService);
  private readonly router = inject(Router);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly session = this.authSession.currentSession;
  protected readonly greeting = computed(() => {
    const name = this.session()?.user.name.trim();
    return name ? `¡Hola, ${name}!` : '¡Hola!';
  });
  protected viewModel$ = this.loadDashboard();
  protected readonly searchMessage = signal('');

  protected readonly getOperationTypeLabel = getOperationTypeLabel;
  protected readonly getTransportModeLabel = getTransportModeLabel;
  protected readonly getTransportModeIcon = getTransportModeIcon;
  protected readonly getShipmentStatusLabel = getShipmentStatusLabel;

  protected retry(): void {
    this.searchMessage.set('');
    this.viewModel$ = this.loadDashboard();
  }

  protected searchShipment(): void {
    const query = this.searchControl.value.trim();
    this.searchMessage.set('');

    if (!query) {
      return;
    }

    this.shipmentService.search({ query, page: 1, pageSize: 30 }).pipe(take(1)).subscribe({
      next: (result) => {
        if (result.totalItems === 0) {
          this.searchMessage.set('No encontramos envíos con ese documento.');
          return;
        }

        if (result.totalItems === 1) {
          void this.router.navigate(['/shipments', result.items[0].id]);
          return;
        }

        void this.router.navigate(['/shipments'], { queryParams: { q: query } });
      },
      error: () => {
        this.searchMessage.set('No fue posible ejecutar la búsqueda. Intenta nuevamente.');
      },
    });
  }

  protected getRouteLabel(shipment: HomeShipmentSummary): string {
    return `${shipment.origin.country} → ${shipment.destination.country}`;
  }

  private loadDashboard(): Observable<DashboardViewModel> {
    return forkJoin({
      metrics: this.shipmentService.getDashboardMetrics(),
      recentShipments: this.shipmentService.getRecent(5),
    }).pipe(
      map(({ metrics, recentShipments }) => {
        if (metrics.totalShipments === 0) {
          return {
            ...initialViewModel,
            state: 'empty',
            metrics,
            message: 'No hay envíos disponibles para construir el dashboard.',
          } satisfies DashboardViewModel;
        }

        return {
          state: 'success',
          metrics,
          recentShipments,
          cards: this.createMetricCards(metrics),
          operationDistribution: this.createOperationDistribution(metrics),
          modeDistribution: this.createModeDistribution(metrics),
        } satisfies DashboardViewModel;
      }),
      startWith(initialViewModel),
      catchError(() =>
        of({
          ...initialViewModel,
          state: 'error',
          message: 'No fue posible cargar el resumen de envíos internacionales.',
        } satisfies DashboardViewModel),
      ),
    );
  }

  private createMetricCards(metrics: DashboardMetrics): MetricCard[] {
    return [
      {
        label: 'Total de envíos',
        value: metrics.totalShipments,
        icon: 'inventory_2',
        detail: `${metrics.totalActive} activos · ${metrics.totalDelivered} entregados`,
        tone: 'primary',
      },
      {
        label: 'Importaciones',
        value: metrics.totalImports,
        icon: 'call_received',
        detail: `${metrics.totalExports} exportaciones registradas`,
        tone: 'secondary',
      },
      {
        label: 'Modalidad aérea',
        value: metrics.totalAir,
        icon: 'flight',
        detail: `${metrics.totalSea} envíos marítimos`,
        tone: 'primary',
      },
      {
        label: 'Con novedad',
        value: metrics.totalWithIssue,
        icon: 'warning',
        detail: `${metrics.totalDelivered} entregados sin gestión adicional`,
        tone: metrics.totalWithIssue > 0 ? 'warning' : 'success',
      },
    ];
  }

  private createOperationDistribution(metrics: DashboardMetrics): DistributionItem[] {
    return [
      this.createDistributionItem('Importaciones', metrics.totalImports, metrics.totalShipments),
      this.createDistributionItem('Exportaciones', metrics.totalExports, metrics.totalShipments),
    ];
  }

  private createModeDistribution(metrics: DashboardMetrics): DistributionItem[] {
    return [
      this.createDistributionItem('Aéreos', metrics.totalAir, metrics.totalShipments),
      this.createDistributionItem('Marítimos', metrics.totalSea, metrics.totalShipments),
    ];
  }

  private createDistributionItem(label: string, count: number, total: number): DistributionItem {
    return {
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }
}
