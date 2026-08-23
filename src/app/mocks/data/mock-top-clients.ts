/**
 * Ranking de clientes por cantidad de envíos.
 *
 * `GET /reports/home` todavía no devuelve `topClients`, así que la tarjeta
 * "Top clientes por cantidad de envíos" de Reportes se alimenta de aquí
 * mientras el resto de la pantalla ya viene del backend. Cuando el endpoint
 * mande el ranking real, `ApiReportsService` deja de usarlo y este archivo —y
 * la carpeta `mocks/` entera— se puede borrar.
 *
 * Es el último dato simulado que queda en la aplicación.
 */
export const mockTopClients: { client: string; total: number }[] = [
  { client: 'Postobon', total: 9 },
  { client: 'Enka', total: 8 },
  { client: 'Almacenes Éxito', total: 6 },
  { client: 'Zenú', total: 4 },
  { client: 'Nutresa', total: 3 },
];
