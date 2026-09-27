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

export const inputRules = {
  /** Documento de cliente o colaborador: cédula o NIT sin dígito de verificación. */
  document: {
    required: true,
    minLength: 5,
    maxLength: 15,
    pattern: /^[0-9]+$/,
    patternMessage: 'Solo se permiten números, sin puntos, guiones ni espacios.',
  },
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
  phone: {
    required: false,
    maxLength: 16,
    pattern: phoneNumberPattern,
    patternMessage: 'El teléfono debe ir en formato internacional, empezando por «+» (ej. +573175766335).',
  },
} as const satisfies Record<string, InputRule>;
