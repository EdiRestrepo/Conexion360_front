import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { InputRule } from './input-rules';

/**
 * Patrones de script o código ejecutable (HU1 – CA03). Se rechazan en vez de
 * limpiarse: el usuario tiene que saber que su entrada no se aceptó.
 *
 * `<` y `>` se bloquean siempre: ningún campo de la aplicación los necesita y
 * cortan de raíz cualquier etiqueta HTML. `&` sí se permite (razones sociales
 * como «Ruiz & Cía»), salvo como entidad numérica (`&#60;`).
 */
const maliciousPatterns: readonly RegExp[] = [
  /[<>]/,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /\bon[a-z]+\s*=/i,
  /&#x?[0-9a-f]+;?/i,
  /expression\s*\(/i,
];

export function containsMaliciousContent(value: string): boolean {
  return maliciousPatterns.some((pattern) => pattern.test(value));
}

/**
 * Valida un texto contra una regla. Longitud y formato se miden sobre el valor
 * recortado, porque es el que se envía; un documento pegado con espacios
 * alrededor no es un error del usuario.
 */
export function validateText(value: string, rule: InputRule): ValidationErrors | null {
  if (containsMaliciousContent(value)) {
    return { maliciousContent: true };
  }

  const text = value.trim();

  if (!text) {
    return rule.required ? { required: true } : null;
  }

  if (text.length > rule.maxLength) {
    return { maxlength: { requiredLength: rule.maxLength, actualLength: text.length } };
  }

  if (rule.minLength && text.length < rule.minLength) {
    return { minlength: { requiredLength: rule.minLength, actualLength: text.length } };
  }

  if (rule.pattern && !rule.pattern.test(text)) {
    return { pattern: { requiredPattern: String(rule.pattern), actualValue: text } };
  }

  return null;
}

export function validatorsFor(rule: InputRule): ValidatorFn[] {
  const byRule: ValidatorFn = (control: AbstractControl) => validateText(readText(control.value), rule);

  return rule.email ? [byRule, Validators.email] : [byRule];
}

/**
 * Filtros que llegan por la URL (`?query=`): no pasan por el input, así que se
 * validan aquí. Si no cumplen, se tratan como vacíos y no llegan al backend.
 */
export function sanitizeQueryValue(value: string | null, rule: InputRule): string {
  const text = (value ?? '').trim();

  return validateText(text, rule) ? '' : text;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
