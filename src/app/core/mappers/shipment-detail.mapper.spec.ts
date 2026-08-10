import { mapShipmentDetailResponse } from './shipment-detail.mapper';

describe('mapShipmentDetailResponse', () => {
  it('should map every section of the detail response', () => {
    const shipment = mapShipmentDetailResponse(createResponse(), 'shipment-194');

    expect(shipment).not.toBeNull();
    expect(shipment?.id).toBe('shipment-194');
    expect(shipment?.documentNumber).toBe('HBL-V71448N7');
    expect(shipment?.documentType).toBe('HBL');
    expect(shipment?.operationType).toBe('EXPO');
    expect(shipment?.transportMode).toBe('SEA');
    expect(shipment?.status).toBe('ORIGIN_CUSTOMS');
    expect(shipment?.client).toBe('Almacenes Éxito');
    expect(shipment?.provider).toBe('Global Freight Logistics S.A.S.');
    expect(shipment?.cargoType).toBe('FCL');
    expect(shipment?.packages).toBe(471);
    expect(shipment?.weightKg).toBe(16058.37);
    expect(shipment?.volumeM3).toBe(69.47);
    expect(shipment?.incoterm).toBe('DDP');
  });

  it('should keep the summary country as label and the tracking values as coordinates', () => {
    const shipment = mapShipmentDetailResponse(createResponse());

    expect(shipment?.destination.country).toBe('Brasil');
    expect(shipment?.destination.latitude).toBe(34.5412252);
    expect(shipment?.destination.longitude).toBe(108.9237067);
    expect(shipment?.origin.country).toBe('Colombia');
    expect(shipment?.origin.latitude).toBe(4.099917);
  });

  it('should map logistic dates dropping the time part', () => {
    const dates = mapShipmentDetailResponse(createResponse())?.logisticDates;

    expect(dates?.originWarehouse).toBe('2025-09-03');
    expect(dates?.etd).toBe('2025-02-14');
    expect(dates?.ata).toBe('2025-08-03');
    expect(dates?.planilla).toBe('2025-03-13');
    expect(dates?.delivery).toBe('2025-03-17');
  });

  it('should map container values coming as strings', () => {
    const container = mapShipmentDetailResponse(createResponse())?.container;

    expect(container?.type).toBe('45HC');
    expect(container?.quantity).toBe(5);
    expect(container?.freeDays).toBe(10);
    expect(container?.remainingDays).toBe(5);
    expect(container?.returnDate).toBe('2025-03-20');
    expect(container?.delayValuePerDay).toBe(120);
    expect(container?.deposit).toBe('2801');
  });

  it('should map financial info and the US formatted invoice date', () => {
    const financialInfo = mapShipmentDetailResponse(createResponse())?.financialInfo;

    expect(financialInfo?.advancePayment?.requestedAt).toBe('2025-11-02');
    expect(financialInfo?.advancePayment?.amount).toBeNull();
    expect(financialInfo?.invoice?.invoiceDate).toBe('2025-03-19');
    expect(financialInfo?.invoice?.expenseValue).toBe(1980.17);
    expect(financialInfo?.invoice?.total).toBe(4694.47);
  });

  it('should map the change log keeping the previous state only when present', () => {
    const events = mapShipmentDetailResponse(createResponse())?.events ?? [];

    expect(events.length).toBe(2);
    expect(events[0].user).toBe('ANALISTASAC');
    expect(events[0].description).toBe('Creación del envio');
    expect(events[0].status).toBe('PENDING');
    expect(events[0].previousValue).toBeUndefined();
    expect(events[1].previousValue).toBe('Pendiente');
    expect(events[1].status).toBe('IN_TRANSIT');
  });

  it('should return null when the response has no transport document', () => {
    expect(mapShipmentDetailResponse({ dataResponse: { resumenShipments: {} } })).toBeNull();
    expect(mapShipmentDetailResponse(null)).toBeNull();
  });

  function createResponse(): unknown {
    return {
      dataResponse: {
        resumenShipments: {
          clientName: 'Almacenes Éxito',
          supplier: 'Global Freight Logistics S.A.S.',
          carrier: 'Maersk',
          merchandiseDescription: 'Químicos',
          documentNumber: 'HBL-V71448N7',
          documentType: 'HBL',
          origin: 'Colombia',
          destination: 'Brasil',
          loadType: 'FCL',
          packagesNumbers: '471',
          weightKg: '16058.37',
          volumeM3: '69.47',
          incoterm: 'DDP',
          operationType: 'EXPO',
          shipmentMode: 'SEA',
        },
        trackingShipments: {
          state: 'En Aduana origen',
          originNameCoordinates: 'Colombia',
          originLatitudCoordinates: '4.0999170',
          originLongitudCoordinates: '-72.9088133',
          destinationNameCoordinates: 'China',
          destinationLatitudCoordinates: '34.5412252',
          destinationLongitudCoordinates: '108.9237067',
        },
        logisticsDatesShipments: {
          storeOriginDate: '2025-09-03T00:00:00',
          etdDate: '2025-02-14T00:00:00',
          atdDate: '2025-02-14T00:00:00',
          etaDate: '2025-06-03T00:00:00',
          ataDate: '2025-08-03T00:00:00',
          storeDestinationDate: '2025-09-03T00:00:00',
          nationalizationDate: '2025-11-03T00:00:00',
          dispatchDestinationDate: '2025-12-03T00:00:00',
          formDate: '2025-03-13T00:00:00',
          containerDeliveryDate: '2025-03-17T00:00:00',
        },
        containerShipments: {
          containerType: '45HC',
          containerAmount: '5',
          containerNumber: 'IMCG2509217',
          daysOff: '10',
          daysRemainingDelivery: '5',
          actualContainerReturnDate: '2025-03-20T00:00:00',
          containerDelayDays: '0',
          costDayOfDelay: '120',
          totalCostContainerDelays: '0',
          containerDepot: '2801',
        },
        financialInfoShipments: {
          advancePaymentRequestDate: '2025-11-02T00:00:00',
          advancePaymentDate: '2025-02-13T00:00:00',
          advancePaymentAmount: '',
          supplierInvoice: 'FP-3N0KGA',
          tccInvoice: 'FT-ZU41UG',
          invoiceNumber: 'FAC-L3WXDRL',
          invoiceDate: '03/19/2025 00:00:00',
          expenseDescription: 'Agenciamiento',
          expenseAmountUSD: '1980.17',
          invoiceSubtotalUSD: '3944.93',
          ivaUSD: '749.54',
          totalInvoiceUSD: '4694.47',
        },
        historyShipments: {
          detailsHistoryShipments: [
            {
              changeDate: '2026-08-09T12:09:37.2110385-05:00',
              changeUser: 'ANALISTASAC',
              message: 'Creación del envio',
              oldState: '',
              newState: 'Pendiente',
            },
            {
              changeDate: '2026-10-09T10:50:42.2012806-05:00',
              changeUser: 'ANALISTASAC',
              message: 'Se exige el envio para iniciar su despacho',
              oldState: 'Pendiente',
              newState: 'En tránsito',
            },
          ],
        },
      },
    };
  }
});
