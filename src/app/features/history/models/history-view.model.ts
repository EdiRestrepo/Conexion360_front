import type { Params } from '@angular/router';
import type { OperationType, Shipment, TransportMode } from '../../../core/models/shipment.model';
export interface HistoryFilters { query: string; operation: OperationType | ''; mode: TransportMode | ''; page: number; pageSize: number; }
/** 'no-data': el cliente no tiene envios completados. 'no-matches': los filtros no arrojaron resultados. */
export type HistoryEmptyReason = 'no-data' | 'no-matches';
export interface HistorySummary { total: number; exports: number; imports: number; air: number; sea: number; }
export interface HistoryViewModel { state: 'loading' | 'empty' | 'error' | 'forbidden' | 'success'; filters: HistoryFilters; shipments: Shipment[]; summary: HistorySummary; totalItems: number; totalPages: number; rangeStart: number; rangeEnd: number; queryParams: Params; message?: string; emptyReason?: HistoryEmptyReason; }
