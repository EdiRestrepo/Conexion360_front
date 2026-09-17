export type UserRole = 'CLIENT' | 'ADMIN' | 'ANALISTAOPE' | 'ANALISTASAC';

/** Roles internos de TCC: operan sobre varios clientes, a diferencia de `CLIENT`. */
export const internalRoles: readonly UserRole[] = ['ADMIN', 'ANALISTAOPE', 'ANALISTASAC'];

/** Lista de permitidos: sin rol conocido (o con uno nuevo de Auth0) se trata como cliente. */
export function isInternalRole(role: UserRole | null | undefined): boolean {
  return role != null && internalRoles.includes(role);
}

/**
 * Analistas: ven solo los envíos de los clientes que tienen asignados. Una
 * respuesta vacía para ellos significa que no tienen clientes, no que falten
 * envíos. `ADMIN` queda fuera porque ve toda la operación.
 */
export function isAnalystRole(role: UserRole | null | undefined): boolean {
  return role === 'ANALISTAOPE' || role === 'ANALISTASAC';
}

export interface Auth0Identity {
  auth0UserId: string;
  email: string;
  name?: string;
  nickname?: string;
  fullName?: string;
  document?: string;
  company?: string;
  picture?: string;
  /** Sale de `user_metadata.phone`; en la raiz de Auth0 solo existe para conexiones SMS. */
  phoneNumber?: string;
  roles: UserRole[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  document?: string;
  company?: string;
  picture?: string | null;
  phoneNumber?: string;
  nickname?: string;
}
