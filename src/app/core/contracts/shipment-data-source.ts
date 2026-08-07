import { Observable } from 'rxjs';

import { PaginatedResult, SearchFilters } from '../models/common.model';
import { DashboardMetrics, ReportMetrics, Shipment, ShipmentEvent } from '../models/shipment.model';

export interface ShipmentDataSource {
  getAll(): Observable<Shipment[]>;
  getActive(): Observable<Shipment[]>;
  getDelivered(): Observable<Shipment[]>;
  getById(id: string): Observable<Shipment | null>;
  search(filters: SearchFilters): Observable<PaginatedResult<Shipment>>;
  getRecent(limit: number): Observable<Shipment[]>;
  getDashboardMetrics(): Observable<DashboardMetrics>;
  getReportMetrics(): Observable<ReportMetrics>;
  getEvents(shipmentId: string): Observable<ShipmentEvent[]>;
}
