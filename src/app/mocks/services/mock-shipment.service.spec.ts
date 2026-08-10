import { fakeAsync, tick } from '@angular/core/testing';

import { ReportMetrics } from '../../core/models/shipment.model';
import { mockShipments } from '../data/mock-shipments';
import { MockShipmentService } from './mock-shipment.service';

describe('MockShipmentService', () => {
  let service: MockShipmentService;

  beforeEach(() => {
    service = new MockShipmentService();
    service.configureSimulation({ latencyMs: 0, responseMode: 'success' });
  });

  afterEach(() => {
    service.resetSimulation();
  });

  it('should calculate report metrics from the centralized mock data', fakeAsync(() => {
    const metrics = getReportMetrics();

    expect(metrics?.totalShipments).toBeGreaterThanOrEqual(30);
    expect(metrics!.totalImports + metrics!.totalExports).toBe(metrics!.totalShipments);
    expect(metrics!.byTransportMode.AIR + metrics!.byTransportMode.SEA).toBe(metrics!.totalShipments);
    expect(metrics?.totalBilledUsd).toBeGreaterThan(0);
    expect(metrics?.totalAdvancesUsd).toBeGreaterThan(0);
    expect(metrics?.averageProgress).toBeGreaterThan(0);
  }));

  it('should rank the top clients by number of shipments', fakeAsync(() => {
    const topClients = getReportMetrics()?.topClients ?? [];

    expect(topClients.length).toBeGreaterThan(0);
    expect(topClients.length).toBeLessThanOrEqual(5);
    topClients.forEach((client, index) => {
      expect(client.client).toBeTruthy();

      if (index > 0) {
        expect(client.total).toBeLessThanOrEqual(topClients[index - 1].total);
      }
    });
  }));

  it('should simulate an empty response', fakeAsync(() => {
    service.configureSimulation({ latencyMs: 0, responseMode: 'empty' });

    const metrics = getReportMetrics();

    expect(metrics?.totalShipments).toBe(0);
    expect(metrics?.topClients).toEqual([]);
    expect(metrics?.averageProgress).toBe(0);
  }));

  it('should simulate a controlled error', fakeAsync(() => {
    service.configureSimulation({ latencyMs: 0, responseMode: 'error' });
    let failed = false;

    service.getReportMetrics().subscribe({ error: () => (failed = true) });
    tick();

    expect(failed).toBeTrue();
  }));

  it('should keep the centralized mock data consistent', () => {
    expect(mockShipments.length).toBeGreaterThanOrEqual(30);

    mockShipments.forEach((shipment) => {
      expect(shipment.id).toBeTruthy();
      expect(shipment.documentNumber).toBeTruthy();
      expect(shipment.events.length).toBeGreaterThan(0);

      if (shipment.transportMode === 'AIR') {
        expect(shipment.container).toBeFalsy();
      }

      const dates = [
        ...Object.values(shipment.logisticDates),
        ...shipment.events.map((event) => event.dateTime),
        shipment.container?.returnDate,
      ].filter((value): value is string => typeof value === 'string');

      dates.forEach((date) => expect(Number.isNaN(new Date(date).getTime())).toBeFalse());
    });
  });

  function getReportMetrics(): ReportMetrics | null {
    let metrics: ReportMetrics | null = null;

    service.getReportMetrics().subscribe((value) => (metrics = value));
    tick();

    return metrics;
  }
});
