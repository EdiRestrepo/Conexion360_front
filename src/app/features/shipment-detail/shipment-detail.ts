import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import {
  Container,
  Shipment,
  ShipmentEvent,
  ShipmentFinancialInfo,
  ShipmentIssue,
  ShipmentStatus,
  TransportMode,
} from '../../core/models/shipment.model';
import { ApiShipmentDetailService } from '../../core/services/api-shipment-detail.service';
import {
  ShipmentChipType,
  getShipmentIssueTitle,
  getShipmentStatusChipType,
  getShipmentStatusIcon,
  getShipmentStatusLabel,
  getTransportModeIcon,
} from '../../core/utils/display-labels';
import { formatShipmentDate, getLocationLabel } from '../../core/utils/shipment-format';
import { ShipmentTracking } from './components/shipment-tracking/shipment-tracking';
import type {
  DetailField,
  DetailTab,
  DetailViewModel,
  HistoryEntry,
  HistoryEntryType,
  LogisticDateRow,
  TabItem,
} from './models/shipment-detail-view.model';

const historyEntryIcons: Record<HistoryEntryType, string> = { STATUS: 'sync', COMMENT: 'chat_bubble', DATE: 'event' };
const historyEntryLabels: Record<HistoryEntryType, string> = { STATUS: 'Estado', COMMENT: 'Comentario', DATE: 'Fecha' };

interface DetailRequest {
  id: string;
  documentNumber: string;
}

type DetailData = Pick<DetailViewModel, 'state' | 'shipment' | 'message'>;

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
  private readonly shipmentDetailService = inject(ApiShipmentDetailService);
  private readonly retry$ = new Subject<void>();

  protected readonly copied = signal(false);
  protected readonly tabs: TabItem[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'tracking', label: 'Seguimiento' },
    { id: 'dates', label: 'Fechas logísticas' },
    { id: 'container', label: 'Contenedor' },
    { id: 'financial', label: 'Financiero' },
    { id: 'history', label: 'Historial' },
  ];

  // El envío consultado solo depende de la ruta y del documento: la pestaña activa es
  // estado de interfaz y no debe disparar una nueva consulta al backend.
  private readonly detailRequest$: Observable<DetailRequest> = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap,
  ]).pipe(
    map(([params, queryParams]) => {
      const id = params.get('id') ?? '';

      // Los listados navegan con el id del envío y el documento de transporte; el detalle
      // se consulta por documento, así que el id sirve de respaldo cuando no viaja el query param.
      return { id, documentNumber: queryParams.get('document') ?? id };
    }),
    distinctUntilChanged((previous, current) => previous.id === current.id && previous.documentNumber === current.documentNumber),
  );

  private readonly detailData$: Observable<DetailData> = combineLatest([
    this.detailRequest$,
    this.retry$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([request]) =>
      this.shipmentDetailService.getDetail(request.documentNumber, request.id).pipe(
        map((shipment) =>
          shipment
            ? ({ state: 'success', shipment } satisfies DetailData)
            : ({
                state: 'not-found',
                shipment: null,
                message: 'No encontramos información para el documento de transporte solicitado.',
              } satisfies DetailData),
        ),
        startWith({ state: 'loading', shipment: null } satisfies DetailData),
        catchError(() =>
          of({
            state: 'error',
            shipment: null,
            message: 'No fue posible cargar el detalle del envío. Intenta nuevamente.',
          } satisfies DetailData),
        ),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly viewModel$: Observable<DetailViewModel> = combineLatest([
    this.detailData$,
    this.route.queryParamMap,
  ]).pipe(
    map(([data, queryParams]) => ({
      ...data,
      selectedTab: this.getTabFromParams(queryParams),
      listQueryParams: this.getListQueryParams(queryParams),
    })),
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
    return shipment.documentType?.trim() || (shipment.transportMode === 'AIR' ? 'AWB' : 'HBL');
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

  protected getHistoryEntries(shipment: Shipment): HistoryEntry[] {
    const chronological = [...shipment.events].sort(
      (first, second) => new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime(),
    );

    return chronological.map((event, index) => this.createHistoryEntry(event, chronological[index - 1] ?? null)).reverse();
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


  private createHistoryEntry(event: ShipmentEvent, previous: ShipmentEvent | null): HistoryEntry {
    const type = event.type ?? 'STATUS';
    const isStatus = type === 'STATUS';

    return {
      id: event.id,
      type,
      icon: historyEntryIcons[type],
      label: event.label?.trim() ? event.label : historyEntryLabels[type],
      previousStatus: event.previousValue ?? (isStatus && previous ? getShipmentStatusLabel(previous.status) : null),
      headline: isStatus ? getShipmentStatusLabel(event.status) : (event.title?.trim() ?? null),
      description: event.description,
      user: event.user?.trim() ? event.user : null,
      dateTime: this.formatEntryDateTime(event.dateTime),
    };
  }

  private formatEntryDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    // El backend envía la marca de tiempo con desfase horario, así que se muestra en la zona del usuario.
    const day = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

    return `${day}, ${time}`;
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
