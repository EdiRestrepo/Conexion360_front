import { Injectable } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';

import {
  DashboardMetrics,
  OperationType,
  ReportMetrics,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from '../../core/models/shipment.model';
import { ShipmentDataSource } from '../../core/contracts/shipment-data-source';
import { isTerminalShipmentStatus } from '../../core/utils/display-labels';
import { mockShipments } from '../data/mock-shipments';

export type MockShipmentResponseMode = 'success' | 'empty' | 'error';

export interface MockShipmentSimulationConfig {
  latencyMs?: number;
  responseMode?: MockShipmentResponseMode;
}

const defaultLatencyMs = 350;
const shipmentStatuses: ShipmentStatus[] = [
  'PENDING',
  'ORIGIN_CUSTOMS',
  'IN_TRANSIT',
  'DESTINATION_CUSTOMS',
  'DELIVERED',
  'WITH_ISSUE',
];

@Injectable({
  providedIn: 'root',
})
export class MockShipmentService implements ShipmentDataSource {
  private simulationConfig: Required<MockShipmentSimulationConfig> = {
    latencyMs: defaultLatencyMs,
    responseMode: 'success',
  };

  configureSimulation(config: MockShipmentSimulationConfig): void {
    this.simulationConfig = {
      ...this.simulationConfig,
      ...config,
    };
  }

  resetSimulation(): void {
    this.simulationConfig = {
      latencyMs: defaultLatencyMs,
      responseMode: 'success',
    };
  }

  getReportMetrics(): Observable<ReportMetrics> {
    return this.getAll().pipe(map((shipments) => this.calculateReportMetrics(shipments)));
  }

  private getAll(): Observable<Shipment[]> {
    if (this.simulationConfig.responseMode === 'error') {
      return throwError(() => new Error('Error simulado al consultar envíos')).pipe(delay(this.simulationConfig.latencyMs));
    }

    const shipments = this.simulationConfig.responseMode === 'empty' ? [] : mockShipments;

    return of(shipments).pipe(delay(this.simulationConfig.latencyMs));
  }

  private calculateDashboardMetrics(shipments: Shipment[]): DashboardMetrics {
    return {
      totalShipments: shipments.length,
      totalImports: shipments.filter((shipment) => shipment.operationType === 'IMPO').length,
      totalExports: shipments.filter((shipment) => shipment.operationType === 'EXPO').length,
      totalAir: shipments.filter((shipment) => shipment.transportMode === 'AIR').length,
      totalSea: shipments.filter((shipment) => shipment.transportMode === 'SEA').length,
      totalDelivered: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
      totalWithIssue: shipments.filter((shipment) => shipment.status === 'WITH_ISSUE').length,
      totalActive: shipments.filter((shipment) => !isTerminalShipmentStatus(shipment.status)).length,
      totalPending: shipments.filter((shipment) => shipment.status === 'PENDING').length,
    };
  }

  private calculateReportMetrics(shipments: Shipment[]): ReportMetrics {
    const dashboardMetrics = this.calculateDashboardMetrics(shipments);
    const totalProgress = shipments.reduce((sum, shipment) => sum + shipment.progress, 0);

    return {
      ...dashboardMetrics,
      totalBilledUsd: this.roundCurrency(
        shipments.reduce((sum, shipment) => sum + (shipment.financialInfo.invoice?.total ?? 0), 0),
      ),
      totalAdvancesUsd: this.roundCurrency(
        shipments.reduce((sum, shipment) => sum + (shipment.financialInfo.advancePayment?.amount ?? 0), 0),
      ),
      totalDelayUsd: this.roundCurrency(
        shipments.reduce((sum, shipment) => sum + (shipment.container?.totalDelayValue ?? 0), 0),
      ),
      averageProgress: shipments.length ? Math.round(totalProgress / shipments.length) : 0,
      byOperationType: this.countByOperation(shipments),
      byTransportMode: this.countByTransportMode(shipments),
      byStatus: this.countByStatus(shipments),
      topClients: this.getTopClients(shipments),
    };
  }

  private countByOperation(shipments: Shipment[]): Record<OperationType, number> {
    return {
      IMPO: shipments.filter((shipment) => shipment.operationType === 'IMPO').length,
      EXPO: shipments.filter((shipment) => shipment.operationType === 'EXPO').length,
    };
  }

  private countByTransportMode(shipments: Shipment[]): Record<TransportMode, number> {
    return {
      AIR: shipments.filter((shipment) => shipment.transportMode === 'AIR').length,
      SEA: shipments.filter((shipment) => shipment.transportMode === 'SEA').length,
    };
  }

  private countByStatus(shipments: Shipment[]): Record<ShipmentStatus, number> {
    return shipmentStatuses.reduce(
      (result, status) => ({
        ...result,
        [status]: shipments.filter((shipment) => shipment.status === status).length,
      }),
      {} as Record<ShipmentStatus, number>,
    );
  }

  private getTopClients(shipments: Shipment[]): { client: string; total: number }[] {
    const totals = shipments.reduce<Record<string, number>>((result, shipment) => {
      result[shipment.client] = (result[shipment.client] ?? 0) + 1;
      return result;
    }, {});

    return Object.entries(totals)
      .map(([client, total]) => ({ client, total }))
      .sort((first, second) => second.total - first.total || first.client.localeCompare(second.client))
      .slice(0, 5);
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }
}
