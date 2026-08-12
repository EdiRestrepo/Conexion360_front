import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { ReportMetrics } from '../models/shipment.model';

/**
 * Contrato de acceso a datos de envíos que todavía no tiene endpoint en el backend.
 *
 * Inicio, Mis envíos, Historial y Detalle del envío ya consumen el backend real
 * (`ApiHomeService`, `ApiMyShipmentsService`, `ApiHistoryService` y
 * `ApiShipmentDetailService`), por lo que sus operaciones salieron de este contrato.
 * Solo queda Reportes, servido por `MockShipmentService` hasta que exista su endpoint.
 */
export interface ShipmentDataSource {
  getReportMetrics(): Observable<ReportMetrics>;
}

/**
 * Origen de datos de reportes. Hoy lo resuelve `MockShipmentService`;
 * cuando exista el endpoint real solo se cambia el proveedor en `app.config.ts`.
 */
export const SHIPMENT_DATA_SOURCE = new InjectionToken<ShipmentDataSource>('SHIPMENT_DATA_SOURCE');
