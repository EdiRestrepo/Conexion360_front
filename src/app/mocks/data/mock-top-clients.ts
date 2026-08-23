import { mockShipments } from './mock-shipments';

const rankingSize = 5;

/**
 * Ranking de clientes por cantidad de envíos, derivado de los envíos simulados.
 *
 * `GET /reports/home` todavía no devuelve `topClients`, así que la tarjeta
 * "Top clientes por cantidad de envíos" de Reportes se sigue alimentando de
 * aquí mientras el resto de la pantalla ya viene del backend. Cuando el
 * endpoint mande el ranking real, `ApiReportsService` deja de usarlo y este
 * archivo se puede borrar.
 */
export const mockTopClients = Object.entries(
  mockShipments.reduce<Record<string, number>>((result, shipment) => {
    result[shipment.client] = (result[shipment.client] ?? 0) + 1;
    return result;
  }, {}),
)
  .map(([client, total]) => ({ client, total }))
  .sort((first, second) => second.total - first.total || first.client.localeCompare(second.client))
  .slice(0, rankingSize);
