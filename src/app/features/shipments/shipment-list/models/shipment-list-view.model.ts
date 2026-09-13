import type { Params } from '@angular/router';
import type { OperationType, Shipment, ShipmentStatus, TransportMode } from '../../../../core/models/shipment.model';
export interface ShipmentListFilters { query: string; operation: OperationType | ''; mode: TransportMode | ''; status: ShipmentStatus | ''; page: number; pageSize: number; }
/** 'no-data': el cliente no tiene envios. 'no-matches': los filtros no arrojaron resultados. */
export type ShipmentListEmptyReason = 'no-data' | 'no-matches';
export interface ShipmentListSummary { total: number; exports: number; imports: number; air: number; sea: number; }
export interface ShipmentListViewModel { state: 'loading' | 'empty' | 'error' | 'forbidden' | 'success'; filters: ShipmentListFilters; shipments: Shipment[]; summary: ShipmentListSummary; totalItems: number; totalPages: number; rangeStart: number; rangeEnd: number; queryParams: Params; message?: string; emptyReason?: ShipmentListEmptyReason; }
