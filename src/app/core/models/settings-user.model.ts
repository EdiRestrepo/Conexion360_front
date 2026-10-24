import { PaginatedResult } from './common.model';
import { UserRole } from './user.model';

/**
 * Usuario de Auth0 tal como lo expone el backend en `/settings/listusers` y
 * `/settings/getuser` (`Auth0UserDto`).
 *
 * `picture`, `lastLogin`, `emailVerified` y `acceptedDataPolicy` no están en el
 * DTO: el mapper los lee de forma tolerante y quedan vacíos hasta que el
 * backend los agregue, sin romper la pantalla.
 */
export interface SettingsUser {
  userId: string;
  email: string;
  userName: string;
  nickname: string;
  /** Raíz de Auth0 (`phone_number`): en conexiones de base de datos casi siempre vacío. */
  phoneNumber: string;
  /** Celular del registro, guardado en `user_metadata`. Es el que se ve y se edita. */
  phone: string;
  isBlocked: boolean;
  createdDate: string | null;
  updatedDate: string | null;

  fullName: string;
  document: string;
  company: string;
  /** Id del rol en Auth0 (`rol_...`); es lo que el PATCH usa para reasignarlo. */
  roleId: string;
  /** Nombre tal como viene de Auth0, aunque no sea uno de los cuatro conocidos. */
  roleName: string;
  role: UserRole | null;
  picture: string | null;
  lastLogin: string | null;
  emailVerified: boolean | null;
  acceptedDataPolicy: boolean | null;
}

export type SettingsUsersPage = PaginatedResult<SettingsUser>;

/** Rol definido en Auth0, de `GET /settings/listroles`. */
export interface SettingsRole {
  id: string;
  name: string;
  description: string;
}

/**
 * Cuerpo del `PATCH /settings/updateuser/{userId}` (`Auth0UserDto` sin fechas).
 *
 * El backend solo aplica lo que cambió, así que se reenvía todo lo conocido y
 * nunca un vacío en lugar de un dato existente. El bloqueo no se cambia por
 * aquí: va por `updateuserstatus`.
 */
export interface SettingsUserUpdate {
  userId: string;
  email: string;
  userName: string;
  nickname: string;
  /** `null` cuando no hay: el swagger exige E.164 y un `''` no lo cumple. */
  phoneNumber: string | null;
  phone: string;
  isBlocked: boolean;
  /** `null` = no tocar el rol; un `''` podría leerse como "cambiarlo a ninguno". */
  roleId: string | null;
  roleName: string;
  fullName: string;
  company: string;
  document: string;
}

/** Contrato del `phoneNumber` en el swagger (E.164). */
export const phoneNumberPattern = /^\+[0-9]{1,15}$/;

export function toSettingsUserUpdate(user: SettingsUser): SettingsUserUpdate {
  return {
    userId: user.userId,
    email: user.email,
    userName: user.userName,
    nickname: user.nickname,
    phoneNumber: user.phoneNumber || null,
    phone: user.phone,
    isBlocked: user.isBlocked,
    roleId: user.roleId || null,
    roleName: user.roleName,
    fullName: user.fullName,
    company: user.company,
    document: user.document,
  };
}

/** Nombre a mostrar, con degradación ordenada hasta el correo. */
export function getSettingsUserDisplayName(user: SettingsUser): string {
  return user.fullName || user.userName || user.nickname || user.email;
}

/** El celular del registro manda; la raíz de Auth0 solo como respaldo. */
export function getSettingsUserPhone(user: SettingsUser): string {
  return user.phone || user.phoneNumber;
}
