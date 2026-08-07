import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, forkJoin, map, of, startWith, take } from 'rxjs';

import { DashboardMetrics } from '../../core/models/shipment.model';
import { ApiHomeService, HomeShipmentSummary } from '../../core/services/api-home.service';
import type { DashboardDistributionItem, DashboardMetricCard, DashboardSearchState, DashboardViewModel } from './models/dashboard-view.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import {
  getOperationTypeLabel,
  getShipmentStatusLabel,
  getTransportModeIcon,
  getTransportModeLabel,
} from '../../core/utils/display-labels';


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

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly session = this.authSession.currentSession;
  protected readonly greeting = computed(() => {
    const name = this.session()?.user.name.trim();
    return name ? `¡Hola, ${name}!` : '¡Hola!';
  });
  protected viewModel$ = this.loadDashboard();
  protected readonly searchMessage = signal('');
  protected readonly searchResults = signal<HomeShipmentSummary[]>([]);
  protected readonly searchState = signal<DashboardSearchState>('idle');
  protected readonly recentSearches = signal<string[]>([]);

  protected readonly getOperationTypeLabel = getOperationTypeLabel;
  protected readonly getTransportModeLabel = getTransportModeLabel;
  protected readonly getTransportModeIcon = getTransportModeIcon;
  protected readonly getShipmentStatusLabel = getShipmentStatusLabel;

  protected retry(): void {
    this.searchMessage.set('');
    this.searchResults.set([]);
    this.searchState.set('idle');
    this.viewModel$ = this.loadDashboard();
  }

  protected searchShipment(event?: Event): boolean {
    event?.preventDefault();
    event?.stopPropagation();

    const query = this.searchControl.value.trim();
    this.searchMessage.set('');
    this.searchResults.set([]);

    if (!query) {
      this.searchState.set('idle');
      return false;
    }

    this.searchState.set('loading');
    this.searchMessage.set('Buscando documento de transporte...');

    this.shipmentService.search({ query, page: 1, pageSize: 30 }).pipe(take(1)).subscribe({
      next: (result) => {
        if (result.totalItems === 0) {
          this.searchState.set('empty');
          this.searchMessage.set('No encontramos envíos con ese documento.');
          return;
        }

        this.searchState.set('success');
        this.searchMessage.set('');
        this.searchResults.set(result.items);
        this.addRecentSearch(query);
      },
      error: () => {
        this.searchState.set('error');
        this.searchResults.set([]);
        this.searchMessage.set('No fue posible ejecutar la búsqueda. Intenta nuevamente.');
      },
    });

    return false;
  }

  protected getRouteLabel(shipment: HomeShipmentSummary): string {
    return `${shipment.origin.country} → ${shipment.destination.country}`;
  }

  protected searchAgain(value: string): void {
    this.searchControl.setValue(value);
    this.searchShipment();
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

  private createMetricCards(metrics: DashboardMetrics): DashboardMetricCard[] {
    return [
      {
        label: 'Total de envíos',
        value: metrics.totalShipments,
        icon: 'inventory_2',
        tone: 'primary',
      },
      {
        label: 'Tipo de operación',
        value: metrics.totalShipments,
        icon: 'call_received',
        detail: `${metrics.totalImports} import · ${metrics.totalExports} export`,
        tone: 'secondary',
        items: [
          { label: 'Importación', value: metrics.totalImports, icon: 'south_west' },
          { label: 'Exportación', value: metrics.totalExports, icon: 'north_east' },
        ],
      },
      {
        label: 'Modalidad',
        value: metrics.totalShipments,
        icon: 'flight',
        detail: `${metrics.totalAir} aéreos · ${metrics.totalSea} marítimos`,
        tone: 'primary',
        items: [
          { label: 'Aérea', value: metrics.totalAir, icon: 'flight' },
          { label: 'Marítima', value: metrics.totalSea, icon: 'directions_boat' },
        ],
      },
      {
        label: 'Estado',
        value: metrics.totalShipments,
        icon: 'warning',
        tone: metrics.totalWithIssue > 0 ? 'warning' : 'success',
      },
    ];
  }

  private createOperationDistribution(metrics: DashboardMetrics): DashboardDistributionItem[] {
    return [
      this.createDistributionItem('EXPO — Exportación', metrics.totalExports, metrics.totalShipments, 'north_east'),
      this.createDistributionItem('IMPO — Importación', metrics.totalImports, metrics.totalShipments, 'south_west'),
    ];
  }

  private createModeDistribution(metrics: DashboardMetrics): DashboardDistributionItem[] {
    return [
      this.createDistributionItem('AIR — Aéreo', metrics.totalAir, metrics.totalShipments, 'flight'),
      this.createDistributionItem('SEA — Marítimo', metrics.totalSea, metrics.totalShipments, 'directions_boat'),
    ];
  }

  private createDistributionItem(label: string, count: number, total: number, icon: string): DashboardDistributionItem {
    return {
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      icon,
    };
  }

  private addRecentSearch(query: string): void {
    this.recentSearches.update((searches) => [query, ...searches.filter((item) => item !== query)].slice(0, 5));
  }
}
