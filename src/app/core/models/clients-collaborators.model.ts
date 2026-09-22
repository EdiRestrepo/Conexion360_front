/**
 * Resultado de las altas del maestro de clientes colaboradores.
 *
 * Los tres endpoints (`createcustomerdb`, `createcollaboratordb` y
 * `createcustomercollaboratordb`) no devuelven la fila creada: solo el
 * `message` de la envoltura estándar, que es lo único que se le puede enseñar
 * a quien ejecutó la acción.
 */
export interface MasterOperationResult {
  /** Vacío cuando la respuesta no trae mensaje; la pantalla pone el suyo. */
  message: string;
}
