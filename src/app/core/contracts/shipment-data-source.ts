import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { ReportMetrics } from '../models/shipment.model';

/**
 * Contrato de acceso a los indicadores de Reportes.
 *
 * Inicio, Mis envíos, Historial y Detalle del envío consumen sus servicios HTTP
 * directamente (`ApiHomeService`, `ApiMyShipmentsService`, `ApiHistoryService` y
 * `ApiShipmentDetailService`), por lo que sus operaciones salieron de este contrato.
 */
export interface ShipmentDataSource {
  getReportMetrics(): Observable<ReportMetrics>;
}

/**
 * Origen de datos de reportes. Lo resuelve `ApiReportsService` contra
 * `GET /reports/home`. El token se mantiene por simetría con
 * `NOTIFICATION_DATA_SOURCE`: la pantalla inyecta el contrato, no el servicio
 * HTTP, así que cambiar de origen es cambiar el proveedor en `app.config.ts`.
 */
export const SHIPMENT_DATA_SOURCE = new InjectionToken<ShipmentDataSource>('SHIPMENT_DATA_SOURCE');
