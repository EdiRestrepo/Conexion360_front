import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import {
  Container,
  Shipment,
  ShipmentEvent,
  ShipmentFinancialInfo,
  ShipmentIssue,
  ShipmentStatus,
  TransportMode,
} from '../../core/models/shipment.model';
import { ApiHomeService, HomeShipmentSummary } from '../../core/services/api-home.service';
import {
  ShipmentChipType,
  getShipmentIssueTitle,
  getShipmentStatusChipType,
  getShipmentStatusIcon,
  getShipmentStatusLabel,
  getShipmentStatusOrder,
  getTransportModeIcon,
} from '../../core/utils/display-labels';
import { formatShipmentDate, getLocationLabel } from '../../core/utils/shipment-format';
import { MockShipmentService } from '../../mocks/services/mock-shipment.service';
import { ShipmentTracking } from './components/shipment-tracking/shipment-tracking';
import type {
  DetailField,
  DetailTab,
  DetailViewModel,
  LogisticDateRow,
  TabItem,
} from './models/shipment-detail-view.model';

const defaultTab: DetailTab = 'summary';
const tabIds: DetailTab[] = ['summary', 'tracking', 'dates', 'container', 'financial', 'history'];

@Component({
  selector: 'app-shipment-detail',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ShipmentTracking],
  templateUrl: './shipment-detail.html',
  styleUrl: './shipment-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shipmentService = inject(MockShipmentService);
  private readonly apiHomeService = inject(ApiHomeService);
  private readonly retry$ = new Subject<void>();

  protected readonly copied = signal(false);
  protected readonly historyDescending = signal(true);
  protected readonly tabs: TabItem[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'tracking', label: 'Seguimiento' },
    { id: 'dates', label: 'Fechas logísticas' },
    { id: 'container', label: 'Contenedor' },
    { id: 'financial', label: 'Financiero' },
    { id: 'history', label: 'Historial' },
  ];

  protected readonly viewModel$: Observable<DetailViewModel> = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap,
    this.retry$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([params, queryParams]) => {
      const id = params.get('id') ?? '';
      const selectedTab = this.getTabFromParams(queryParams);
      const listQueryParams = this.getListQueryParams(queryParams);
      const documentNumber = queryParams.get('document') ?? '';

      return this.shipmentService.getById(id).pipe(
        switchMap((shipment) => {
          if (shipment) {
            return of({
              state: 'success',
              selectedTab,
              listQueryParams,
              shipment,
            } satisfies DetailViewModel);
          }

          return this.getShipmentFromHomeSearch(id, documentNumber, selectedTab, listQueryParams);
        }),
        startWith({ state: 'loading', selectedTab, listQueryParams, shipment: null } satisfies DetailViewModel),
        catchError(() =>
          of({
            state: 'error',
            selectedTab,
            listQueryParams,
            shipment: null,
            message: 'No fue posible cargar el detalle del envío. Intenta nuevamente.',
          } satisfies DetailViewModel),
        ),
      );
    }),
  );

  protected readonly getTransportModeIcon = getTransportModeIcon;
  protected readonly getShipmentStatusLabel = getShipmentStatusLabel;
  protected readonly getShipmentStatusIcon = getShipmentStatusIcon;
  protected readonly getIssueTitle = getShipmentIssueTitle;
  protected readonly getLocationLabel = getLocationLabel;
  protected readonly formatDate = formatShipmentDate;

  protected retry(): void {
    this.retry$.next();
  }

  protected goBack(queryParams: Params): void {
    if (queryParams['from'] === 'dashboard') {
      void this.router.navigate(['/dashboard']);
      return;
    }

    if (queryParams['from'] === 'history') {
      void this.router.navigate(['/history'], { queryParams: this.getReturnQueryParams(queryParams) });
      return;
    }

    void this.router.navigate(['/shipments'], { queryParams: this.getReturnQueryParams(queryParams) });
  }

  protected selectTab(tab: DetailTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  protected copyDocument(documentNumber: string): void {
    const clipboard = globalThis.navigator?.clipboard;

    if (!clipboard) {
      this.copied.set(false);
      return;
    }

    void clipboard.writeText(documentNumber).then(
      () => this.copied.set(true),
      () => this.copied.set(false),
    );
  }

  protected getDocumentType(shipment: Shipment): string {
    return shipment.transportMode === 'AIR' ? 'AWB' : 'HBL';
  }

  protected getStatusChipClass(shipment: { status: ShipmentStatus }): string {
    const classes: Record<ShipmentChipType, string> = {
      neutral: 'status-chip--neutral',
      info: 'status-chip--info',
      success: 'status-chip--success',
      warning: 'status-chip--issue',
      danger: 'status-chip--issue',
    };

    return classes[getShipmentStatusChipType(shipment.status)];
  }

  protected getShipmentInfoFields(shipment: Shipment): DetailField[] {
    return [
      { label: 'Cliente', value: shipment.client },
      { label: 'Proveedor / agente', value: shipment.provider },
      { label: 'Transportista', value: shipment.carrier },
      { label: 'Descripción de mercancía', value: shipment.merchandiseDescription },
      { label: 'Documento de transporte', value: shipment.documentNumber, accent: true },
      { label: 'Tipo de documento', value: this.getDocumentType(shipment) },
      { label: 'Incoterms', value: 'Pendiente por integrar' },
    ];
  }

  protected getRouteCargoFields(shipment: Shipment): DetailField[] {
    return [
      { label: 'Origen', value: this.getLocationLabel(shipment.origin) },
      { label: 'Destino', value: this.getLocationLabel(shipment.destination) },
      { label: 'Tipo de carga', value: shipment.cargoType },
      { label: 'Cantidad bultos', value: shipment.packages.toLocaleString('es-CO') },
      { label: 'Peso', value: `${shipment.weightKg.toLocaleString('es-CO')} kg` },
      { label: 'Volumen', value: `${shipment.volumeM3.toLocaleString('es-CO')} m³` },
    ];
  }

  protected getIssueSeverity(issue: ShipmentIssue): string {
    return issue.resolved ? 'Resuelta' : 'Activa';
  }

  protected getSortedEvents(shipment: Shipment): ShipmentEvent[] {
    const direction = this.historyDescending() ? -1 : 1;

    return [...shipment.events].sort((first, second) => direction * (new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime()));
  }

  protected toggleHistoryOrder(): void {
    this.historyDescending.update((value) => !value);
  }

  protected getHistoryOrderLabel(): string {
    return this.historyDescending() ? 'Más reciente primero' : 'Más antiguo primero';
  }

  protected formatEventDate(value: string): string {
    return this.formatDate(value);
  }

  protected formatEventTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(date);
  }
  protected getLogisticDateRows(shipment: Shipment): LogisticDateRow[] {
    const dates = shipment.logisticDates;

    return [
      { label: 'Bodega Origen', date: this.formatDate(dates.originWarehouse) },
      { label: 'ETD (Salida estimada)', date: this.formatDate(dates.etd) },
      { label: 'ATD (Salida real)', date: this.formatDate(dates.atd) },
      { label: 'ETA (Llegada estimada)', date: this.formatDate(dates.eta) },
      { label: 'ATA (Llegada real)', date: this.formatDate(dates.ata) },
      { label: 'Bodega Destino', date: this.formatDate(dates.destinationWarehouse) },
      { label: 'Nacionalización', date: this.formatDate(dates.nationalization) },
      { label: 'Despacho Destino', date: this.formatDate(dates.dispatch) },
      { label: 'Planilla', date: this.formatDate(dates.planilla) },
      { label: 'Entrega contenedor', date: this.formatDate(dates.delivery) },
    ];
  }

  protected getContainerFields(container: Container | null | undefined): DetailField[] {
    return [
      this.createOptionalField('Tipo de contenedor', container?.type),
      this.createOptionalField('Cantidad de contenedores', this.formatCount(container?.quantity)),
      this.createOptionalField('Número de contenedor', container?.number),
      this.createOptionalField('Días libres', this.formatDays(container?.freeDays)),
      this.createOptionalField('Días restantes para entrega', this.formatDays(container?.remainingDays)),
      this.createOptionalField('Fecha devolución real', this.formatOptionalDate(container?.returnDate)),
      this.createOptionalField('Días de demora', this.formatDays(container?.delayDays)),
      this.createOptionalField('Valor por día de demora', this.formatUsd(container?.delayValuePerDay)),
      this.createOptionalField('Total demoras', this.formatUsd(container?.totalDelayValue)),
      this.createOptionalField('Depósito contenedor', container?.deposit),
    ];
  }

  protected getAdvanceFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const advance = financialInfo.advancePayment;
    const invoice = financialInfo.invoice;

    return [
      this.createOptionalField('Fecha solicitud anticipo', this.formatOptionalDate(advance?.requestedAt)),
      this.createOptionalField('Fecha pago anticipo', this.formatOptionalDate(advance?.paidAt)),
      this.createOptionalField('Valor anticipo', this.formatUsd(advance?.amount)),
      this.createOptionalField('Subtotal factura', this.formatUsd(invoice?.subtotal)),
      this.createOptionalField('IVA', this.formatUsd(invoice?.tax)),
      this.createOptionalField('Total factura', this.formatUsd(invoice?.total)),
    ];
  }

  protected getInvoiceFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const invoice = financialInfo.invoice;

    return [
      this.createOptionalField('Factura proveedor', invoice?.providerInvoice, true),
      this.createOptionalField('Factura TCC', invoice?.tccInvoice, true),
      this.createOptionalField('Número de factura', invoice?.invoiceNumber, true),
      this.createOptionalField('Fecha de factura', this.formatOptionalDate(invoice?.invoiceDate)),
      this.createOptionalField('Descripción gasto', invoice?.expenseDescription),
      this.createOptionalField('Valor gasto', this.formatUsd(invoice?.expenseValue)),
    ];
  }

  protected getFinancialSummaryFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const invoice = financialInfo.invoice;

    return [
      this.createOptionalField('Subtotal', this.formatUsd(invoice?.subtotal)),
      this.createOptionalField('IVA', this.formatUsd(invoice?.tax)),
      this.createOptionalField('Total factura', this.formatUsd(invoice?.total)),
    ];
  }

  protected getModeClass(mode: TransportMode): string {
    return mode === 'AIR' ? 'detail-header__mode--air' : 'detail-header__mode--sea';
  }

  private getTabFromParams(params: ParamMap): DetailTab {
    const tab = params.get('tab');
    return tabIds.includes(tab as DetailTab) ? (tab as DetailTab) : defaultTab;
  }

  private getListQueryParams(params: ParamMap): Params {
    return params.keys.reduce<Params>((result, key) => {
      if (key !== 'tab') {
        result[key] = params.get(key);
      }
      return result;
    }, {});
  }

  private getReturnQueryParams(queryParams: Params): Params {
    const returnQueryParams = { ...queryParams };
    delete returnQueryParams['from'];
    delete returnQueryParams['document'];
    return returnQueryParams;
  }

  private getShipmentFromHomeSearch(
    id: string,
    documentNumber: string,
    selectedTab: DetailTab,
    listQueryParams: Params,
  ): Observable<DetailViewModel> {
    if (!documentNumber.trim()) {
      return of({
        state: 'not-found',
        selectedTab,
        listQueryParams,
        shipment: null,
        message: 'El identificador solicitado no existe en los datos simulados.',
      } satisfies DetailViewModel);
    }

    return this.apiHomeService.search({ query: documentNumber, page: 1, pageSize: 10 }).pipe(
      map((result) => {
        const normalizedDocument = documentNumber.trim().toLowerCase();
        const summary =
          result.items.find((item) => item.id === id || item.documentNumber.toLowerCase() === normalizedDocument) ??
          result.items[0] ??
          null;

        return {
          state: summary ? 'success' : 'not-found',
          selectedTab,
          listQueryParams,
          shipment: summary ? this.createShipmentFromHomeSummary(summary) : null,
          message: summary
            ? undefined
            : 'El identificador solicitado no fue encontrado en la consulta por documento.',
        } satisfies DetailViewModel;
      }),
      catchError(() =>
        of({
          state: 'error',
          selectedTab,
          listQueryParams,
          shipment: null,
          message: 'No fue posible cargar el detalle desde la búsqueda por documento. Intenta nuevamente.',
        } satisfies DetailViewModel),
      ),
    );
  }

  private createShipmentFromHomeSummary(summary: HomeShipmentSummary): Shipment {
    return {
      id: summary.id,
      documentNumber: summary.documentNumber,
      operationType: summary.operationType,
      transportMode: summary.transportMode,
      status: summary.status,
      client: 'Cliente autenticado',
      provider: 'Pendiente por integrar',
      incoterm: '-',
      origin: {
        country: summary.origin.country || '-',
        city: null,
        terminal: null,
        latitude: null,
        longitude: null,
      },
      destination: {
        country: summary.destination.country || '-',
        city: null,
        terminal: null,
        latitude: null,
        longitude: null,
      },
      merchandiseDescription: 'Información pendiente por integrar desde el servicio de detalle.',
      cargoType: summary.transportMode === 'SEA' ? 'FCL' : 'LCL',
      packages: 0,
      weightKg: 0,
      volumeM3: 0,
      carrier: 'Pendiente por integrar',
      logisticDates: {},
      container: null,
      financialInfo: {
        advancePayment: null,
        invoice: null,
      },
      events: [
        {
          id: `${summary.id || summary.documentNumber}-home-search`,
          dateTime: '2026-01-01T00:00:00.000Z',
          status: summary.status,
          location: {
            country: summary.origin.country || '-',
            city: null,
            terminal: null,
          },
          description: 'Detalle construido desde la búsqueda por documento de transporte.',
          source: 'Servicio de inicio Conexion360',
          user: null,
        },
      ],
      issue:
        summary.status === 'WITH_ISSUE'
          ? {
              type: 'DELAY',
              comment: 'El envío registra una novedad según el servicio de inicio.',
              date: '2026-01-01',
              resolved: false,
            }
          : null,
      progress: this.getProgressFromStatus(summary.status),
      nextStop: null,
    };
  }

  private getProgressFromStatus(status: ShipmentStatus): number {
    if (status === 'DELIVERED') {
      return 100;
    }

    if (status === 'PENDING') {
      return 0;
    }

    if (status === 'IN_TRANSIT') {
      return 50;
    }

    return Math.min(getShipmentStatusOrder(status) * 12, 90);
  }

  private createOptionalField(label: string, value: string | null | undefined, accent = false): DetailField {
    const text = value?.trim();

    return text ? { label, value: text, accent } : { label, value: 'No disponible', empty: true };
  }

  private formatCount(value: number | null | undefined): string | null {
    return value === null || value === undefined ? null : value.toLocaleString('es-CO');
  }

  private formatDays(value: number | null | undefined): string | null {
    return value === null || value === undefined ? null : `${value.toLocaleString('es-CO')} días`;
  }

  private formatUsd(value: number | null | undefined): string | null {
    return value === null || value === undefined ? null : `USD ${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
  }

  private formatOptionalDate(value: string | null | undefined): string | null {
    const formatted = this.formatDate(value);

    return formatted === '-' ? null : formatted;
  }
}
