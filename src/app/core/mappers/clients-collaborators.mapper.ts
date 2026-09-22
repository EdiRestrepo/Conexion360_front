import { MasterOperationResult } from '../models/clients-collaborators.model';
import { asRecord, readString } from './json-record.util';

/**
 * Traduce la respuesta de las altas del maestro de clientes colaboradores.
 *
 * El `message` va en la raíz de la envoltura, no dentro de `dataResponse`, así
 * que aquí no hace falta desenvolver nada. Sirve igual para el cuerpo de un
 * error: el backend usa la misma forma para contar por qué no pudo.
 */
export function mapMasterOperationResponse(response: unknown): MasterOperationResult {
  return { message: readString(asRecord(response), ['message', 'mensaje']) };
}
