import { AbstractControl } from '@angular/forms';

import { InputRule } from './input-rules';

/** Texto exigido por HU1 – CA03 para cualquier entrada con contenido malicioso. */
export const maliciousContentMessage = 'La información ingresada no es válida.';

/** El error se muestra cuando el usuario ya interactuó con el campo, no al abrir la pantalla. */
export function shouldShowError(control: AbstractControl): boolean {
  return control.invalid && (control.dirty || control.touched);
}

/**
 * Traduce las claves de error a un único mensaje en español. El orden importa:
 * el contenido malicioso gana sobre cualquier otro error.
 */
export function getControlErrorMessage(control: AbstractControl, rule: InputRule): string | null {
  const errors = control.errors;

  if (!errors) {
    return null;
  }

  if (errors['maliciousContent']) {
    return maliciousContentMessage;
  }

  if (errors['required']) {
    return 'Este campo es obligatorio.';
  }

  if (errors['maxlength']) {
    return `Máximo ${rule.maxLength} caracteres.`;
  }

  if (errors['minlength']) {
    return `Mínimo ${rule.minLength} caracteres.`;
  }

  if (errors['pattern']) {
    return rule.patternMessage ?? 'El formato no es válido.';
  }

  if (errors['email']) {
    return 'El correo debe tener un formato válido.';
  }

  return 'El valor no es válido.';
}

/** Mensaje visible del campo, o `null` si no hay nada que mostrar todavía. */
export function getVisibleErrorMessage(control: AbstractControl, rule: InputRule): string | null {
  return shouldShowError(control) ? getControlErrorMessage(control, rule) : null;
}
