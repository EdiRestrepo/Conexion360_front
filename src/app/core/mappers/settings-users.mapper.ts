import { SettingsRole, SettingsUser, SettingsUsersPage } from '../models/settings-user.model';
import { toUserRole } from '../models/user.model';
import {
  JsonRecord,
  asRecord,
  getValue,
  readArray,
  readNumber,
  readOptionalBoolean,
  readString,
} from './json-record.util';

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

/** `GET /settings/listroles`: array plano, envuelto o no en `dataResponse`. */
export function mapSettingsRolesResponse(response: unknown): SettingsRole[] {
  const root = asRecord(response);
  const payload = Array.isArray(response) ? response : (getValue(root, ['dataResponse', 'DataResponse']) ?? []);
  const items = Array.isArray(payload) ? flattenNestedArrays(payload) : [];

  return items
    .map((item) => {
      const record = asRecord(item);

      return {
        id: readString(record, ['id', 'roleId']),
        name: readString(record, ['name', 'roleName']),
        description: readString(record, ['description']),
      };
    })
    .filter((role) => Boolean(role.id && role.name));
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
  const roleName = readRoleName(record, metadata);

  return {
    userId: readString(record, ['userId', 'user_id', 'auth0UserId', 'sub', 'id']) || email,
    email,
    userName: readString(record, ['userName', 'user_name', 'name']),
    nickname: readString(record, ['nickname', 'nickName']),
    phoneNumber: readString(record, ['phoneNumber', 'phone_number']),
    phone: readPhone(record, metadata),
    isBlocked: readOptionalBoolean(record, ['isBlocked', 'blocked']) ?? false,
    createdDate: readDateTime(record, ['createdDate', 'created_at', 'createdAt']),
    updatedDate: readDateTime(record, ['updatedDate', 'updated_at', 'updatedAt']),

    fullName: readString(record, ['fullName', 'full_name']) || readString(metadata, ['fullName', 'full_name', 'name']),
    document: readString(record, ['document', 'documento', 'idClient']) || readString(metadata, ['document', 'documento']),
    company: readString(record, ['company', 'empresa']) || readString(metadata, ['company', 'empresa']),
    picture: readString(record, ['picture', 'avatar']) || null,
    roleId: readString(record, ['roleId', 'role_id']),
    roleName,
    role: toUserRole(roleName),
    lastLogin: readDateTime(record, ['lastLogin', 'last_login']),
    emailVerified: readOptionalBoolean(record, ['emailVerified', 'email_verified']) ?? null,
    acceptedDataPolicy:
      readOptionalBoolean(record, ['acceptedDataPolicy', 'accepted_data_policy']) ??
      readOptionalBoolean(metadata, ['acceptedDataPolicy', 'accepted_data_policy']) ??
      null,
  };
}

/**
 * `Auth0UserDto.phone` ya llega como texto. Si en su lugar viniera el objeto
 * `phone` del `user_metadata` (que guarda 13 variantes de lo mismo), se toma
 * una sola de sus claves.
 */
function readPhone(record: JsonRecord, metadata: JsonRecord): string {
  const direct = readString(record, ['phone', 'celular']);

  if (direct) {
    return direct;
  }

  const phone = asRecord(getValue(record, ['phone']) ?? getValue(metadata, ['phone']));

  return readString(phone, ['number', 'internationalNumber', 'international_number']);
}

function readRoleName(record: JsonRecord, metadata: JsonRecord): string {
  return (
    readString(record, ['roleName', 'role', 'rol']) || readString(metadata, ['role', 'rol']) || firstRole(record)
  );
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
