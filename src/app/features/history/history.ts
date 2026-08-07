import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';

import { OperationType, Shipment, ShipmentStatus, TransportMode } from '../../core/models/shipment.model';
import {
  ShipmentChipType,
  getOperationTypeLabel,
  getShipmentStatusChipType,
  getShipmentStatusIcon,
  getShipmentStatusLabel,
  getTransportModeIcon,
  getTransportModeLabel,
} from '../../core/utils/display-labels';
import { ApiHistoryService } from '../../core/services/api-history.service';
import { MyShipmentsPage } from '../../core/services/shipments-page.mapper';
import type { HistoryFilters, HistoryViewModel } from './models/history-view.model';

const defaultFilters: HistoryFilters = {
  query: '',
  operation: '',
  mode: '',
  page: 1,
  pageSize: 10,
};

const initialViewModel: HistoryViewModel = {
  state: 'loading',
  filters: defaultFilters,
  shipments: [],
  summary: { total: 0, exports: 0, imports: 0, air: 0, sea: 0, withIssues: 0 },
  totalItems: 0,
  totalPages: 0,
  rangeStart: 0,
  rangeEnd: 0,
  queryParams: {},
};

const pageSizeOptions = [10, 25, 50] as const;
@Component({
  selector: 'app-history',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './history.html',
  styleUrl: './history.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly historyService = inject(ApiHistoryService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly operationControl = new FormControl<OperationType | ''>('', { nonNullable: true });
  protected readonly modeControl = new FormControl<TransportMode | ''>('', { nonNullable: true });
  protected readonly pageSizeControl = new FormControl<number>(defaultFilters.pageSize, { nonNullable: true });
  protected readonly pageSizeOptions = pageSizeOptions;
  protected readonly viewModel$: Observable<HistoryViewModel>;

  protected readonly getOperationTypeLabel = getOperationTypeLabel;
  protected readonly getTransportModeLabel = getTransportModeLabel;
  protected readonly getTransportModeIcon = getTransportModeIcon;
  protected readonly getShipmentStatusLabel = getShipmentStatusLabel;
  protected readonly getShipmentStatusIcon = getShipmentStatusIcon;

  constructor() {
    this.viewModel$ = this.route.queryParamMap.pipe(
      map((params) => this.getFiltersFromParams(params)),
      tap((filters) => this.patchControls(filters)),
      switchMap((filters) =>
        this.historyService
          .search({
            query: filters.query,
            operationType: filters.operation || null,
            transportMode: filters.mode || null,
            page: filters.page,
            pageSize: filters.pageSize,
          })
          .pipe(
            map((result) => this.createViewModel(result, filters)),
            startWith({ ...initialViewModel, filters } satisfies HistoryViewModel),
            catchError(() =>
              of({
                ...initialViewModel,
                state: 'error',
                filters,
                message: 'No fue posible cargar el historial de envíos. Intenta nuevamente.',
              } satisfies HistoryViewModel),
            ),
          ),
      ),
    );

    this.bindQueryControl();
    this.bindFilterControl(this.operationControl, 'operation');
    this.bindFilterControl(this.modeControl, 'mode');
    this.bindPageSizeControl();
  }

  protected retry(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.buildQueryParams(defaultFilters) });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.buildQueryParams(defaultFilters) });
  }

  protected goToPage(page: number): void {
    void this.updateQueryParams({ page: Math.max(page, 1) });
  }

  protected getLocationLabel(shipment: Shipment): string {
    return `${shipment.origin.country} → ${shipment.destination.country}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    if (value.startsWith('0001-01-01')) {
      return '-';
    }

    const dateValue = value.includes('T') ? value : `${value}T00:00:00.000Z`;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return this.toDayMonthYearDateFormat(date);
  }

  private toDayMonthYearDateFormat(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
  }

  protected getStatusChipClass(status: ShipmentStatus): string {
    const type = getShipmentStatusChipType(status);
    const classes: Record<ShipmentChipType, string> = {
      neutral: 'status-chip--neutral',
      info: 'status-chip--info',
      success: 'status-chip--success',
      warning: 'status-chip--issue',
      danger: 'status-chip--issue',
    };
    return classes[type];
  }

  private bindQueryControl(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => void this.updateQueryParams({ query: query.trim(), page: 1 }));
  }

  private bindFilterControl<T extends OperationType | TransportMode | ''>(
    control: FormControl<T>,
    key: 'operation' | 'mode',
  ): void {
    control.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => void this.updateQueryParams({ [key]: value || null, page: 1 }));
  }

  private bindPageSizeControl(): void {
    this.pageSizeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((pageSize) => void this.updateQueryParams({ pageSize: Number(pageSize), page: 1 }));
  }

  private createViewModel(result: MyShipmentsPage, filters: HistoryFilters): HistoryViewModel {
    const totalItems = result.totalItems;
    const totalPages = Math.max(result.totalPages, 1);
    const page = Math.min(Math.max(result.page, 1), totalPages);
    const start = (page - 1) * result.pageSize;
    const state = result.items.length === 0 ? 'empty' : 'success';

    return {
      state,
      filters: { ...filters, page, pageSize: result.pageSize },
      shipments: result.items,
      summary: {
        total: result.summary.total,
        exports: result.summary.exports,
        imports: result.summary.imports,
        air: result.summary.air,
        sea: result.summary.sea,
        withIssues: result.summary.withIssues,
      },
      totalItems,
      totalPages,
      rangeStart: totalItems === 0 ? 0 : start + 1,
      rangeEnd: totalItems === 0 ? 0 : Math.min(start + result.items.length, totalItems),
      queryParams: { ...this.buildQueryParams({ ...filters, page }), from: 'history' },
      message: result.items.length === 0 ? 'No hay envíos completados que coincidan con los filtros.' : undefined,
    };
  }

  private getFiltersFromParams(params: ParamMap): HistoryFilters {
    const pageSize = this.toPageSize(params.get('pageSize'));

    return {
      query: params.get('query') ?? params.get('q') ?? '',
      operation: this.toOperationType(params.get('operation')),
      mode: this.toTransportMode(params.get('mode')),
      page: this.toPositiveNumber(params.get('page'), 1),
      pageSize,
    };
  }

  private patchControls(filters: HistoryFilters): void {
    this.searchControl.setValue(filters.query, { emitEvent: false });
    this.operationControl.setValue(filters.operation, { emitEvent: false });
    this.modeControl.setValue(filters.mode, { emitEvent: false });
    this.pageSizeControl.setValue(filters.pageSize, { emitEvent: false });
  }

  private updateQueryParams(params: Params): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private buildQueryParams(filters: HistoryFilters): Params {
    return {
      query: filters.query || null,
      operation: filters.operation || null,
      mode: filters.mode || null,
      page: filters.page === 1 ? null : filters.page,
      pageSize: filters.pageSize === defaultFilters.pageSize ? null : filters.pageSize,
    };
  }

  private toOperationType(value: string | null): OperationType | '' {
    return value === 'IMPO' || value === 'EXPO' ? value : '';
  }

  private toTransportMode(value: string | null): TransportMode | '' {
    return value === 'AIR' || value === 'SEA' ? value : '';
  }

  private toPageSize(value: string | null): number {
    const pageSize = this.toPositiveNumber(value, defaultFilters.pageSize);
    return pageSizeOptions.includes(pageSize as (typeof pageSizeOptions)[number]) ? pageSize : defaultFilters.pageSize;
  }

  private toPositiveNumber(value: string | null, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
