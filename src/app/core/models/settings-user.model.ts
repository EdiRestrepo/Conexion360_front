import { PaginatedResult } from './common.model';
import { UserRole } from './user.model';

/**
 * Usuario de Auth0 tal como lo expone el backend en `/settings/listusers`.
 *
 * El `Auth0UserDto` del swagger solo trae `userId`, `email`, `userName`,
 * `phoneNumber`, `createdDate`, `updatedDate`, `isBlocked` y `nickname`. Los
 * campos marcados abajo como "pendiente backend" viven hoy en el
 * `user_metadata` de Auth0 y en el claim de roles, pero todavía no llegan al
 * DTO: el mapper los lee de forma tolerante y quedan vacíos hasta entonces,
 * sin romper la pantalla.
 */
export interface SettingsUser {
  userId: string;
  email: string;
  userName: string;
  nickname: string;
  phoneNumber: string;
  isBlocked: boolean;
  createdDate: string | null;
  updatedDate: string | null;

  fullName: string;
  document: string;
  company: string;
  picture: string | null;
  role: UserRole | null;
  lastLogin: string | null;
  emailVerified: boolean | null;
  acceptedDataPolicy: boolean | null;
}

export type SettingsUsersPage = PaginatedResult<SettingsUser>;

/** Cuerpo del `PATCH /settings/updateuser/{idClient}`: solo campos del `Auth0UserDto`. */
export interface SettingsUserUpdate {
  userId: string;
  email: string;
  userName: string;
  nickname: string;
  phoneNumber: string;
  isBlocked: boolean;
}

/** Contrato del `phoneNumber` en el swagger (E.164). */
export const phoneNumberPattern = /^\+[0-9]{1,15}$/;

export function toSettingsUserUpdate(user: SettingsUser): SettingsUserUpdate {
  return {
    userId: user.userId,
    email: user.email,
    userName: user.userName,
    nickname: user.nickname,
    phoneNumber: user.phoneNumber,
    isBlocked: user.isBlocked,
  };
}

/** Nombre a mostrar, con degradación ordenada hasta el correo. */
export function getSettingsUserDisplayName(user: SettingsUser): string {
  return user.fullName || user.userName || user.nickname || user.email;
}
