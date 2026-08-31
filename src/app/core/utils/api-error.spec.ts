import { HttpErrorResponse } from '@angular/common/http';

import { getApiErrorMessage } from './api-error';

describe('getApiErrorMessage', () => {
  const fallback = 'No fue posible eliminar el usuario.';

  it('prefers `error` over the envelope`s generic `message`', () => {
    // Forma real de un 500 del backend: `message` trae el texto de éxito por
    // defecto y el motivo verdadero está en `error`.
    const error = new HttpErrorResponse({
      status: 500,
      error: { status: 500, error: 'Insufficient scope: delete:users', message: 'Solicitud procesada' },
    });

    expect(getApiErrorMessage(error, fallback)).toBe(`${fallback} Insufficient scope: delete:users`);
  });

  it('still uses `message` when there is no `error`', () => {
    const error = new HttpErrorResponse({ status: 500, error: { message: 'Usuario no encontrado' } });

    expect(getApiErrorMessage(error, fallback)).toBe(`${fallback} Usuario no encontrado`);
  });

  it('falls back to the HTTP status when there is no message', () => {
    const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden', error: {} });

    expect(getApiErrorMessage(error, fallback)).toBe(`${fallback} (HTTP 403 Forbidden)`);
  });

  it('explains a missing response separately from a server error', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(getApiErrorMessage(error, fallback)).toContain('No hubo respuesta del servidor');
  });

  it('returns the plain fallback for non-HTTP errors', () => {
    expect(getApiErrorMessage(new Error('boom'), fallback)).toBe(fallback);
  });
});
