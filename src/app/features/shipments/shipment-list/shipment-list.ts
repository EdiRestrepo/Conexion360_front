import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';

import { OperationType, Shipment, ShipmentStatus, TransportMode } from '../../../core/models/shipment.model';
import {
  ShipmentChipType,
  getOperationTypeLabel,
  getShipmentStatusChipType,
  getShipmentStatusIcon,
  getShipmentStatusLabel,
  getTransportModeIcon,
  getTransportModeLabel,
  isTerminalShipmentStatus,
} from '../../../core/utils/display-labels';
import { MockShipmentService } from '../../../mocks/services/mock-shipment.service';
import type { ShipmentListFilters, ShipmentListSummary, ShipmentListViewModel } from './models/shipment-list-view.model';

const defaultFilters: ShipmentListFilters = {
  query: '',
  operation: '',
  mode: '',
  status: '',
  page: 1,
  pageSize: 10,
};

const initialViewModel: ShipmentListViewModel = {
  state: 'loading',
  filters: defaultFilters,
  shipments: [],
  summary: { total: 0, air: 0, sea: 0 },
  totalItems: 0,
  totalPages: 0,
  rangeStart: 0,
  rangeEnd: 0,
  queryParams: {},
};

const pageSizeOptions = [10, 25, 50] as const;
const statusOptions: ShipmentStatus[] = [
  'PENDING',
  'ORIGIN_CUSTOMS',
  'IN_TRANSIT',
  'DESTINATION_CUSTOMS',
  'DELIVERED',
  'WITH_ISSUE',
];

@Component({
  selector: 'app-shipment-list',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './shipment-list.html',
  styleUrl: './shipment-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shipmentService = inject(MockShipmentService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly operationControl = new FormControl<OperationType | ''>('', { nonNullable: true });
  protected readonly modeControl = new FormControl<TransportMode | ''>('', { nonNullable: true });
  protected readonly statusControl = new FormControl<ShipmentStatus | ''>('', { nonNullable: true });
  protected readonly pageSizeControl = new FormControl<number>(defaultFilters.pageSize, { nonNullable: true });
  protected readonly pageSizeOptions = pageSizeOptions;
  protected readonly statusOptions = statusOptions;
  protected readonly viewModel$: Observable<ShipmentListViewModel>;

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
        this.shipmentService.getActive().pipe(
          map((shipments) => this.createViewModel(shipments, filters)),
          startWith({ ...initialViewModel, filters } satisfies ShipmentListViewModel),
          catchError(() =>
            of({
              ...initialViewModel,
              state: 'error',
              filters,
              message: 'No fue posible cargar los envíos activos. Intenta nuevamente.',
            } satisfies ShipmentListViewModel),
          ),
        ),
      ),
    );

    this.bindQueryControl();
    this.bindFilterControl(this.operationControl, 'operation');
    this.bindFilterControl(this.modeControl, 'mode');
    this.bindFilterControl(this.statusControl, 'status');
    this.bindPageSizeControl();
  }

  protected retry(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.buildQueryParams(defaultFilters) });
  }

  protected goToPage(page: number, filters: ShipmentListFilters): void {
    void this.updateQueryParams({ page: Math.max(page, 1) });
  }

  protected getLocationLabel(shipment: Shipment): string {
    return `${shipment.origin.country} → ${shipment.destination.country}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      date,
    );
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

  protected clearFilters(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.buildQueryParams(defaultFilters) });
  }

  private bindQueryControl(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => void this.updateQueryParams({ query: query.trim(), page: 1 }));
  }

  private bindFilterControl<T extends OperationType | TransportMode | ShipmentStatus | ''>(
    control: FormControl<T>,
    key: 'operation' | 'mode' | 'status',
  ): void {
    control.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => void this.updateQueryParams({ [key]: value || null, page: 1 }));
  }

  private bindPageSizeControl(): void {
    this.pageSizeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((pageSize) => void this.updateQueryParams({ pageSize, page: 1 }));
  }

  private createViewModel(shipments: Shipment[], filters: ShipmentListFilters): ShipmentListViewModel {
    const filteredShipments = this.filterShipments(shipments, filters);
    const totalItems = filteredShipments.length;
    const totalPages = Math.max(Math.ceil(totalItems / filters.pageSize), 1);
    const page = Math.min(filters.page, totalPages);
    const start = (page - 1) * filters.pageSize;
    const pagedShipments = filteredShipments.slice(start, start + filters.pageSize);
    const state = shipments.length === 0 ? 'empty' : totalItems === 0 ? 'empty' : 'success';

    return {
      state,
      filters: { ...filters, page },
      shipments: pagedShipments,
      summary: {
        total: totalItems,
        air: filteredShipments.filter((shipment) => shipment.transportMode === 'AIR').length,
        sea: filteredShipments.filter((shipment) => shipment.transportMode === 'SEA').length,
      },
      totalItems,
      totalPages,
      rangeStart: totalItems === 0 ? 0 : start + 1,
      rangeEnd: Math.min(start + filters.pageSize, totalItems),
      queryParams: this.buildQueryParams({ ...filters, page }),
      message: totalItems === 0 ? 'No hay envíos activos que coincidan con los filtros.' : undefined,
    };
  }

  private filterShipments(shipments: Shipment[], filters: ShipmentListFilters): Shipment[] {
    const query = filters.query.toLowerCase();

    return shipments.filter((shipment) => {
      const searchableText = [
        shipment.documentNumber,
        shipment.client,
        shipment.origin.country,
        shipment.origin.city,
        shipment.destination.country,
        shipment.destination.city,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return (
        !isTerminalShipmentStatus(shipment.status) &&
        (!query || searchableText.includes(query)) &&
        (!filters.operation || shipment.operationType === filters.operation) &&
        (!filters.mode || shipment.transportMode === filters.mode) &&
        (!filters.status || shipment.status === filters.status)
      );
    });
  }

  private getFiltersFromParams(params: ParamMap): ShipmentListFilters {
    const operation = this.toOperationType(params.get('operation'));
    const mode = this.toTransportMode(params.get('mode'));
    const status = this.toShipmentStatus(params.get('status'));
    const pageSize = this.toPageSize(params.get('pageSize'));

    return {
      query: params.get('query') ?? params.get('q') ?? '',
      operation,
      mode,
      status,
      page: this.toPositiveNumber(params.get('page'), 1),
      pageSize,
    };
  }

  private patchControls(filters: ShipmentListFilters): void {
    this.searchControl.setValue(filters.query, { emitEvent: false });
    this.operationControl.setValue(filters.operation, { emitEvent: false });
    this.modeControl.setValue(filters.mode, { emitEvent: false });
    this.statusControl.setValue(filters.status, { emitEvent: false });
    this.pageSizeControl.setValue(filters.pageSize, { emitEvent: false });
  }

  private updateQueryParams(params: Params): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private buildQueryParams(filters: ShipmentListFilters): Params {
    return {
      query: filters.query || null,
      operation: filters.operation || null,
      mode: filters.mode || null,
      status: filters.status || null,
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

  private toShipmentStatus(value: string | null): ShipmentStatus | '' {
    return statusOptions.includes(value as ShipmentStatus) ? (value as ShipmentStatus) : '';
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
