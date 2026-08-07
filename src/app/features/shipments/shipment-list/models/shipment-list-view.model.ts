import type { Params } from '@angular/router';
import type { OperationType, Shipment, ShipmentStatus, TransportMode } from '../../../../core/models/shipment.model';
export interface ShipmentListFilters { query: string; operation: OperationType | ''; mode: TransportMode | ''; status: ShipmentStatus | ''; page: number; pageSize: number; }
export interface ShipmentListSummary { total: number; exports: number; imports: number; air: number; sea: number; withIssues: number; }
export interface ShipmentListViewModel { state: 'loading' | 'empty' | 'error' | 'success'; filters: ShipmentListFilters; shipments: Shipment[]; summary: ShipmentListSummary; totalItems: number; totalPages: number; rangeStart: number; rangeEnd: number; queryParams: Params; message?: string; }
