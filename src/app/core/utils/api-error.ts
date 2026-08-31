import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensaje de error accionable a partir de una respuesta fallida.
 *
 * El backend envuelve sus respuestas en `{ status, error, message }`, así que
 * cuando manda un motivo se muestra tal cual. Si no, se cae al código HTTP: un
 * 403 (permisos del M2M en Auth0) y un 500 (fallo del backend) piden acciones
 * distintas, y un texto genérico obliga a abrir DevTools para distinguirlos.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const detail = readErrorDetail(error.error);

  if (detail) {
    return `${fallback} ${detail}`;
  }

  if (error.status === 0) {
    return `${fallback} No hubo respuesta del servidor: revisa que el backend esté arriba.`;
  }

  return `${fallback} (HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ''})`;
}

function readErrorDetail(body: unknown): string {
  if (typeof body === 'string') {
    return body.trim();
  }

  if (typeof body !== 'object' || body === null) {
    return '';
  }

  const record = body as Record<string, unknown>;

  // `error` va antes que `message`: en una respuesta fallida el backend deja en
  // `message` el texto genérico del envoltorio ("Solicitud procesada") y el
  // motivo real en `error`. Leer `message` primero oculta justo el detalle útil.
  for (const key of ['error', 'Error', 'detail', 'title', 'message', 'Message']) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}
