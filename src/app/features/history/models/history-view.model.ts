import type { Params } from '@angular/router';
import type { OperationType, Shipment, TransportMode } from '../../../core/models/shipment.model';
export interface HistoryFilters { query: string; operation: OperationType | ''; mode: TransportMode | ''; page: number; pageSize: number; }
export interface HistorySummary { total: number; exports: number; imports: number; air: number; sea: number; withIssues: number; }
export interface HistoryViewModel { state: 'loading' | 'empty' | 'error' | 'success'; filters: HistoryFilters; shipments: Shipment[]; summary: HistorySummary; totalItems: number; totalPages: number; rangeStart: number; rangeEnd: number; queryParams: Params; message?: string; }
