import { CustomerCollaboratorRelation, MasterOperationResult } from '../models/clients-collaborators.model';
import { asRecord, getValue, readString } from './json-record.util';

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

/**
 * `listcustomersdb` y `listcollaboratorsdb` devuelven `[{ identificacion }]`.
 * Se quitan vacíos y repetidos y se ordena numéricamente, que es como el
 * administrador busca un documento en la lista.
 */
export function mapIdentifierListResponse(response: unknown): string[] {
  const identifiers = readItems(response).map((item) => readString(asRecord(item), ['identificacion', 'id']));

  return [...new Set(identifiers.filter(Boolean))].sort(compareDocuments);
}

export function mapCustomerCollaboratorRelationsResponse(response: unknown): CustomerCollaboratorRelation[] {
  return readItems(response)
    .map((item) => {
      const record = asRecord(item);

      return {
        customerId: readString(record, ['identificacionCustomer', 'customerId']),
        collaboratorId: readString(record, ['identificacionCollaborator', 'collaboratorId']),
      };
    })
    .filter((relation) => Boolean(relation.customerId && relation.collaboratorId))
    .sort((a, b) => compareDocuments(a.customerId, b.customerId) || compareDocuments(a.collaboratorId, b.collaboratorId));
}

/** El swagger documenta un array plano; si llega envuelto en `dataResponse`, también sirve. */
function readItems(response: unknown): unknown[] {
  const payload = Array.isArray(response) ? response : getValue(asRecord(response), ['dataResponse', 'DataResponse']);

  return Array.isArray(payload) ? payload : [];
}

function compareDocuments(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true });
}
