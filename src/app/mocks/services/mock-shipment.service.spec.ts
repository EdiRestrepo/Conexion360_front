import { fakeAsync, tick } from '@angular/core/testing';

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

  it('should return at least 30 centralized mock shipments', fakeAsync(() => {
    let total = 0;

    service.getAll().subscribe((shipments) => {
      total = shipments.length;
    });
    tick();

    expect(total).toBeGreaterThanOrEqual(30);
  }));

  it('should return active shipments excluding terminal statuses', fakeAsync(() => {
    service.getActive().subscribe((shipments) => {
      expect(shipments.length).toBeGreaterThan(0);
      expect(shipments.every((shipment) => shipment.status !== 'DELIVERED')).toBeTrue();
    });
    tick();
  }));

  it('should return delivered shipments only', fakeAsync(() => {
    service.getDelivered().subscribe((shipments) => {
      expect(shipments.length).toBeGreaterThan(0);
      expect(shipments.every((shipment) => shipment.status === 'DELIVERED')).toBeTrue();
    });
    tick();
  }));

  it('should return a shipment by stable id', fakeAsync(() => {
    service.getById('shipment-001').subscribe((shipment) => {
      expect(shipment?.id).toBe('shipment-001');
      expect(shipment?.documentNumber).toBeTruthy();
    });
    tick();
  }));

  it('should return null when shipment id does not exist', fakeAsync(() => {
    service.getById('missing').subscribe((shipment) => {
      expect(shipment).toBeNull();
    });
    tick();
  }));

  it('should search by free text', fakeAsync(() => {
    service.search({ query: 'enka', page: 1, pageSize: 50 }).subscribe((result) => {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((shipment) => shipment.client.toLowerCase().includes('enka'))).toBeTrue();
    });
    tick();
  }));

  it('should filter by operation, mode and status', fakeAsync(() => {
    service.search({ operationType: 'IMPO', transportMode: 'SEA', status: 'WITH_ISSUE', page: 1, pageSize: 10 }).subscribe((result) => {
      expect(result.items.length).toBeGreaterThan(0);
      expect(
        result.items.every(
          (shipment) =>
            shipment.operationType === 'IMPO' && shipment.transportMode === 'SEA' && shipment.status === 'WITH_ISSUE',
        ),
      ).toBeTrue();
    });
    tick();
  }));

  it('should paginate search results', fakeAsync(() => {
    service.search({ page: 2, pageSize: 5 }).subscribe((result) => {
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.items.length).toBe(5);
      expect(result.totalItems).toBeGreaterThan(5);
      expect(result.totalPages).toBeGreaterThan(1);
    });
    tick();
  }));

  it('should return recent shipments limited by parameter', fakeAsync(() => {
    service.getRecent(4).subscribe((shipments) => {
      expect(shipments.length).toBe(4);
    });
    tick();
  }));

  it('should calculate dashboard metrics from mock data', fakeAsync(() => {
    service.getDashboardMetrics().subscribe((metrics) => {
      expect(metrics.totalShipments).toBeGreaterThanOrEqual(30);
      expect(metrics.totalImports + metrics.totalExports).toBe(metrics.totalShipments);
      expect(metrics.totalAir + metrics.totalSea).toBe(metrics.totalShipments);
      expect(metrics.totalWithIssue).toBeGreaterThan(0);
    });
    tick();
  }));

  it('should calculate report metrics from financial and container data', fakeAsync(() => {
    service.getReportMetrics().subscribe((metrics) => {
      expect(metrics.totalBilledUsd).toBeGreaterThan(0);
      expect(metrics.totalAdvancesUsd).toBeGreaterThan(0);
      expect(metrics.totalDelayUsd).toBeGreaterThan(0);
      expect(metrics.byStatus.WITH_ISSUE).toBeGreaterThan(0);
      expect(metrics.topClients.length).toBeGreaterThan(0);
    });
    tick();
  }));

  it('should return events for a shipment', fakeAsync(() => {
    service.getEvents('shipment-001').subscribe((events) => {
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].location.country).toBeTruthy();
    });
    tick();
  }));

  it('should model null when conceptual data is unavailable', fakeAsync(() => {
    service.getById('shipment-001').subscribe((shipment) => {
      expect(shipment?.financialInfo.advancePayment?.paidAt === null || typeof shipment?.financialInfo.advancePayment?.paidAt === 'string').toBeTrue();
      expect(shipment?.financialInfo.invoice === null || typeof shipment?.financialInfo.invoice === 'object').toBeTrue();
    });
    tick();
  }));

  it('should generate valid ISO dates for mock shipments', fakeAsync(() => {
    service.getAll().subscribe((shipments) => {
      const dates = shipments.flatMap((shipment) => [
        ...Object.values(shipment.logisticDates),
        ...shipment.events.map((event) => event.dateTime),
        shipment.issue?.date,
        shipment.container?.returnDate,
        shipment.financialInfo.advancePayment?.requestedAt,
        shipment.financialInfo.advancePayment?.paidAt,
        shipment.financialInfo.invoice?.invoiceDate,
      ]);

      expect(
        dates
          .filter((date): date is string => typeof date === 'string')
          .every((date) => !Number.isNaN(new Date(date).getTime())),
      ).toBeTrue();
    });
    tick();
  }));

  it('should omit container when it does not apply to AIR shipments', fakeAsync(() => {
    service.search({ transportMode: 'AIR', page: 1, pageSize: 1 }).subscribe((result) => {
      expect('container' in result.items[0]).toBeTrue();
      expect(result.items[0].container).toBeUndefined();
    });
    tick();
  }));

  it('should keep zero when the real value is zero', fakeAsync(() => {
    service.search({ transportMode: 'SEA', page: 1, pageSize: 30 }).subscribe((result) => {
      const shipmentWithoutDelay = result.items.find((shipment) => shipment.container?.delayDays === 0);
      expect(shipmentWithoutDelay?.container?.totalDelayValue).toBe(0);
    });
    tick();
  }));

  it('should simulate an empty response', fakeAsync(() => {
    service.configureSimulation({ latencyMs: 0, responseMode: 'empty' });

    service.getAll().subscribe((shipments) => {
      expect(shipments).toEqual([]);
    });
    tick();
  }));

  it('should simulate a controlled error', fakeAsync(() => {
    service.configureSimulation({ latencyMs: 0, responseMode: 'error' });
    let errorMessage = '';

    service.getAll().subscribe({
      error: (error: Error) => {
        errorMessage = error.message;
      },
    });
    tick();

    expect(errorMessage).toBe('Error simulado al consultar envíos');
  }));
});
