import { phoneNumberPattern } from '../models/settings-user.model';

/**
 * Reglas de validación por tipo de campo (HU1 – CA02). Es la única fuente de
 * longitudes y patrones: los componentes las consumen con `validatorsFor` y
 * pintan `maxLength` en el atributo `maxlength` del input.
 */
export interface InputRule {
  readonly required: boolean;
  readonly maxLength: number;
  readonly minLength?: number;
  readonly pattern?: RegExp;
  /** Texto que se muestra cuando el valor no cumple `pattern`. */
  readonly patternMessage?: string;
  readonly email?: boolean;
}

/** Documento de cliente o colaborador: cédula o NIT sin dígito de verificación. */
const documentRule = {
  required: true,
  minLength: 5,
  maxLength: 15,
  pattern: /^[0-9]+$/,
  patternMessage: 'Solo se permiten números, sin puntos, guiones ni espacios.',
} as const;

/**
 * Nombre o empresa de un usuario de Auth0. Admite `@` y `_` porque hay cuentas
 * cuyo nombre es el propio correo; si no, no se podrían volver a guardar.
 */
const profileTextRule = {
  required: false,
  maxLength: 100,
  pattern: /^[\p{L}\p{N} .,'&@_-]*$/u,
  patternMessage: 'Usa solo letras, números, espacios y los signos . , \' & @ _ -',
} as const;

export const inputRules = {
  document: documentRule,
  /** Buscador por documento (filtro de Reportes): mismo formato, pero vacío es «sin filtro». */
  documentFilter: { ...documentRule, required: false },
  /** Buscadores de envíos: HBL, AWB, MBL, cliente, origen o destino. */
  searchQuery: {
    required: false,
    maxLength: 50,
    pattern: /^[\p{L}0-9 .,/-]*$/u,
    patternMessage: 'Usa solo letras, números, espacios y los signos - . / ,',
  },
  email: {
    required: true,
    maxLength: 254,
    email: true,
  },
  /** Solo se compara contra el correo del usuario; nunca se envía al backend. */
  emailConfirmation: {
    required: false,
    maxLength: 254,
  },
  personName: profileTextRule,
  companyName: profileTextRule,
  phone: {
    required: false,
    maxLength: 16,
    pattern: phoneNumberPattern,
    patternMessage: 'El teléfono debe ir en formato internacional, empezando por «+» (ej. +573175766335).',
  },
} as const satisfies Record<string, InputRule>;
