import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import {
  Container,
  Shipment,
  ShipmentDocument,
  ShipmentDocumentStatus,
  ShipmentEvent,
  ShipmentFinancialInfo,
  ShipmentIssue,
  ShipmentStatus,
  TransportMode,
} from '../../core/models/shipment.model';
import { ApiHomeService, HomeShipmentSummary } from '../../core/services/api-home.service';
import {
  ShipmentChipType,
  getDocumentStatusChipType,
  getDocumentStatusIcon,
  getDocumentStatusLabel,
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
  DateState,
  DetailField,
  DetailTab,
  DetailViewModel,
  LogisticDateRow,
  TabItem,
} from './models/shipment-detail-view.model';

const defaultTab: DetailTab = 'summary';
const tabIds: DetailTab[] = ['summary', 'tracking', 'dates', 'container', 'financial', 'documents', 'history'];

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
  protected readonly selectedDocument = signal<ShipmentDocument | null>(null);
  protected readonly downloadMessage = signal<string | null>(null);
  protected readonly historyDescending = signal(true);
  protected readonly tabs: TabItem[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'tracking', label: 'Seguimiento' },
    { id: 'dates', label: 'Fechas logísticas' },
    { id: 'container', label: 'Contenedor' },
    { id: 'financial', label: 'Financiero' },
    { id: 'documents', label: 'Documentos' },
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
  protected readonly getDocumentStatusLabel = getDocumentStatusLabel;
  protected readonly getDocumentStatusIcon = getDocumentStatusIcon;
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

  protected getDocumentStatusChipClass(status: ShipmentDocumentStatus): string {
    const classes: Record<ShipmentChipType, string> = {
      neutral: 'status-chip--neutral',
      info: 'status-chip--info',
      success: 'status-chip--success',
      warning: 'status-chip--issue',
      danger: 'status-chip--issue',
    };

    return classes[getDocumentStatusChipType(status)];
  }

  protected getDocumentSizeLabel(sizeKb: number | null): string {
    if (sizeKb === null) {
      return '-';
    }

    if (sizeKb >= 1024) {
      return `${(sizeKb / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
    }

    return `${sizeKb.toLocaleString('es-CO')} KB`;
  }

  protected previewDocument(documentItem: ShipmentDocument): void {
    this.selectedDocument.set(documentItem);
  }

  protected closeDocumentPreview(): void {
    this.selectedDocument.set(null);
  }

  protected downloadDocument(documentItem: ShipmentDocument, shipment: Shipment): void {
    const content = [
      'Conexion360 - descarga simulada',
      `Documento: ${documentItem.name}`,
      `Tipo: ${documentItem.type}`,
      `Envío: ${shipment.documentNumber}`,
      'Este archivo fue generado localmente para el prototipo. No proviene de un endpoint real.',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');

    link.href = url;
    link.download = `${this.toSafeFileName(shipment.documentNumber)}-${this.toSafeFileName(documentItem.type)}.txt`;
    link.click();
    globalThis.URL.revokeObjectURL(url);
    this.downloadMessage.set(`Descarga simulada generada para ${documentItem.name}.`);
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
      this.createDateRow('Bodega origen', null, dates.originWarehouse, true),
      this.createDateRow('Salida ETD / ATD', dates.etd, dates.atd, true),
      this.createDateRow('Llegada ETA / ATA', dates.eta, dates.ata, true),
      this.createDateRow('Bodega destino', null, dates.destinationWarehouse, true),
      this.createDateRow('Nacionalización', null, dates.nationalization, true),
      this.createDateRow('Despacho destino', null, dates.dispatch, true),
      this.createDateRow('Planilla', null, dates.planilla, true),
      this.createDateRow('Entrega', null, dates.delivery, true),
      this.createDateRow('Devolución de contenedor', null, shipment.container?.returnDate ?? null, shipment.transportMode === 'SEA' && Boolean(shipment.container)),
    ];
  }

  protected getContainerFields(container: Container): DetailField[] {
    return [
      { label: 'Tipo', value: this.formatOptional(container.type) },
      { label: 'Cantidad', value: container.quantity.toLocaleString('es-CO') },
      { label: 'Número', value: this.formatOptional(container.number) },
      { label: 'Días libres', value: this.formatNullableNumber(container.freeDays) },
      { label: 'Días restantes', value: this.formatNullableNumber(container.remainingDays) },
      { label: 'Fecha devolución real', value: this.formatDate(container.returnDate) },
      { label: 'Días de demora', value: container.delayDays.toLocaleString('es-CO') },
      { label: 'Valor por día', value: this.formatCurrency(container.delayValuePerDay) },
      { label: 'Total demoras', value: this.formatCurrency(container.totalDelayValue) },
      { label: 'Depósito', value: this.formatOptional(container.deposit) },
    ];
  }

  protected hasFinancialInfo(financialInfo: ShipmentFinancialInfo): boolean {
    return Boolean(financialInfo.advancePayment || financialInfo.invoice);
  }

  protected getAdvanceFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const advance = financialInfo.advancePayment;

    if (!advance) {
      return [];
    }

    return [
      { label: 'Fecha solicitud', value: this.formatDate(advance.requestedAt) },
      { label: 'Fecha pago', value: this.formatDate(advance.paidAt) },
      { label: 'Valor', value: this.formatCurrency(advance.amount) },
    ];
  }

  protected getInvoiceFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const invoice = financialInfo.invoice;

    if (!invoice) {
      return [];
    }

    return [
      { label: 'Factura proveedor', value: this.formatOptional(invoice.providerInvoice) },
      { label: 'Factura TCC', value: this.formatOptional(invoice.tccInvoice) },
      { label: 'Número de factura', value: this.formatOptional(invoice.invoiceNumber) },
      { label: 'Fecha', value: this.formatDate(invoice.invoiceDate) },
      { label: 'Descripción del gasto', value: this.formatOptional(invoice.expenseDescription) },
      { label: 'Valor', value: this.formatCurrency(invoice.expenseValue) },
    ];
  }

  protected getFinancialSummaryFields(financialInfo: ShipmentFinancialInfo): DetailField[] {
    const invoice = financialInfo.invoice;

    if (!invoice) {
      return [];
    }

    return [
      { label: 'Subtotal', value: this.formatCurrency(invoice.subtotal) },
      { label: 'IVA', value: this.formatCurrency(invoice.tax) },
      { label: 'Total', value: this.formatCurrency(invoice.total) },
    ];
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
  }

  protected getModeClass(mode: TransportMode): string {
    return mode === 'AIR' ? 'detail-header__mode--air' : 'detail-header__mode--sea';
  }

  private createDateRow(label: string, estimated: string | null | undefined, actual: string | null | undefined, applies: boolean): LogisticDateRow {
    const state = this.getDateState(estimated, actual, applies);

    return {
      label,
      estimated: this.formatDate(estimated),
      actual: this.formatDate(actual),
      state,
      stateLabel: this.getDateStateLabel(state),
    };
  }

  private getDateState(estimated: string | null | undefined, actual: string | null | undefined, applies: boolean): DateState {
    if (!applies) {
      return 'not-applicable';
    }

    if (!estimated && !actual) {
      return 'no-data';
    }

    if (estimated && !actual) {
      return 'pending';
    }

    if (!estimated && actual) {
      return 'on-time';
    }

    const estimatedDate = new Date(`${estimated}T00:00:00.000Z`);
    const actualDate = new Date(`${actual}T00:00:00.000Z`);

    if (Number.isNaN(estimatedDate.getTime()) || Number.isNaN(actualDate.getTime())) {
      return 'no-data';
    }

    return actualDate.getTime() > estimatedDate.getTime() ? 'delayed' : 'on-time';
  }

  private getDateStateLabel(state: DateState): string {
    const labels: Record<DateState, string> = {
      'on-time': 'A tiempo',
      delayed: 'Retrasado',
      pending: 'Pendiente',
      'not-applicable': 'No aplica',
      'no-data': 'Sin dato',
    };

    return labels[state];
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
      documents: [],
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

  private toSafeFileName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }
  private formatOptional(value: string | null | undefined): string {
    return value?.trim() ? value : '-';
  }

  private formatNullableNumber(value: number | null | undefined): string {
    return value === null || value === undefined ? '-' : value.toLocaleString('es-CO');
  }
}
