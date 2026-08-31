import { SettingsUser, SettingsUsersPage } from '../models/settings-user.model';
import { UserRole } from '../models/user.model';
import {
  JsonRecord,
  asRecord,
  getValue,
  readArray,
  readNumber,
  readOptionalBoolean,
  readString,
} from './json-record.util';

const validRoles: readonly UserRole[] = ['CLIENT', 'ADMIN', 'ANALISTAOPE', 'ANALISTASAC'];

export function mapSettingsUsersPageResponse(response: unknown, page: number, pageSize: number): SettingsUsersPage {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;
  const meta = asRecord(getValue(root, ['meta', 'Meta']));
  const users = readUsers(payload).map((item) => toSettingsUser(item));
  const resolvedPageSize = readNumber(meta, ['limit', 'size', 'pageSize'], pageSize);
  const totalItems = readNumber(meta, ['totalItems', 'totalRecords', 'total'], users.length);

  return {
    items: users,
    // Se conserva la página pedida en vez de `meta.currentPage`: el backend la
    // devuelve como 0 incluso cuando se solicita la 1, así que no es fiable.
    page,
    pageSize: resolvedPageSize,
    totalItems,
    totalPages: readNumber(meta, ['totalPages'], Math.max(Math.ceil(totalItems / Math.max(resolvedPageSize, 1)), 1)),
  };
}

export function mapSettingsUserResponse(response: unknown): SettingsUser {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;

  return toSettingsUser(Array.isArray(payload) ? payload[0] ?? {} : payload);
}

/**
 * El listado puede llegar como array plano, envuelto bajo alguna clave
 * (`users`, `items`, `data`), o —como hace hoy `listusers`— dentro de otro
 * array: `dataResponse: [[ {...}, {...} ]]`. Se contemplan las tres formas.
 */
function readUsers(payload: unknown): unknown[] {
  const candidate = Array.isArray(payload)
    ? payload
    : readArray(asRecord(payload), ['users', 'usuarios', 'items', 'data', 'listUsers']);

  return flattenNestedArrays(candidate);
}

function flattenNestedArrays(items: unknown[]): unknown[] {
  return items.flatMap((item) => (Array.isArray(item) ? flattenNestedArrays(item) : [item]));
}

function toSettingsUser(value: unknown): SettingsUser {
  const record = asRecord(value);
  // Por si el backend reenvía el metadata de Auth0 tal cual en vez de aplanarlo.
  const metadata = {
    ...asRecord(getValue(record, ['userMetadata', 'user_metadata'])),
    ...asRecord(getValue(record, ['appMetadata', 'app_metadata'])),
  };
  const email = readString(record, ['email', 'correo']);

  return {
    userId: readString(record, ['userId', 'user_id', 'auth0UserId', 'sub', 'id']) || email,
    email,
    userName: readString(record, ['userName', 'user_name', 'name']),
    nickname: readString(record, ['nickname', 'nickName']),
    phoneNumber: readPhoneNumber(record, metadata),
    isBlocked: readOptionalBoolean(record, ['isBlocked', 'blocked']) ?? false,
    createdDate: readDateTime(record, ['createdDate', 'created_at', 'createdAt']),
    updatedDate: readDateTime(record, ['updatedDate', 'updated_at', 'updatedAt']),

    fullName: readString(record, ['fullName', 'full_name']) || readString(metadata, ['fullName', 'full_name', 'name']),
    document: readString(record, ['document', 'documento', 'idClient']) || readString(metadata, ['document', 'documento']),
    company: readString(record, ['company', 'empresa']) || readString(metadata, ['company', 'empresa']),
    picture: readString(record, ['picture', 'avatar']) || null,
    role: readRole(record, metadata),
    lastLogin: readDateTime(record, ['lastLogin', 'last_login']),
    emailVerified: readOptionalBoolean(record, ['emailVerified', 'email_verified']) ?? null,
    acceptedDataPolicy:
      readOptionalBoolean(record, ['acceptedDataPolicy', 'accepted_data_policy']) ??
      readOptionalBoolean(metadata, ['acceptedDataPolicy', 'accepted_data_policy']) ??
      null,
  };
}

/**
 * `Auth0UserDto.phoneNumber` ya viene en E.164. Si en su lugar llega el objeto
 * `phone` del `user_metadata` (que guarda 13 variantes de lo mismo), se toma
 * una sola de sus claves.
 */
function readPhoneNumber(record: JsonRecord, metadata: JsonRecord): string {
  const direct = readString(record, ['phoneNumber', 'phone_number']);

  if (direct) {
    return direct;
  }

  const phone = asRecord(getValue(record, ['phone']) ?? getValue(metadata, ['phone']));

  return readString(phone, ['number', 'internationalNumber', 'international_number']);
}

/** Rol desconocido → `null`, mismo criterio defensivo que `Auth0FacadeService.mapRoles`. */
function readRole(record: JsonRecord, metadata: JsonRecord): UserRole | null {
  const candidate = readString(record, ['role', 'rol']) || readString(metadata, ['role', 'rol']) || firstRole(record);
  const normalized = candidate.trim().toUpperCase();

  return validRoles.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

function firstRole(record: JsonRecord): string {
  const roles = readArray(record, ['roles']);

  return typeof roles[0] === 'string' ? roles[0] : '';
}

/**
 * A diferencia de `toDateValue`, aquí se conserva la hora: en usuarios interesa
 * el momento del último acceso, no solo el día.
 */
function readDateTime(record: JsonRecord, keys: string[]): string | null {
  const value = readString(record, keys);

  if (!value || value.startsWith('0001-01-01')) {
    return null;
  }

  return value;
}
