import { Observable, of, tap } from 'rxjs';

/**
 * Marca de "sesión de navegador" en `sessionStorage`, más un canal
 * `BroadcastChannel` para preguntarle a las pestañas hermanas (mismo origen,
 * mismo navegador) si alguna ya tiene la marca antes de forzar un login.
 *
 * Auth0 guarda su caché en `localStorage` (`cacheLocation: 'localstorage'` +
 * `useRefreshTokens`), que sobrevive al cierre del navegador: sin esta marca
 * la aplicación entraría directo al dashboard al abrirse. `sessionStorage` en
 * cambio muere con la pestaña, pero sobrevive a un F5 y a la ida y vuelta a
 * Auth0 dentro de la misma pestaña — justo el comportamiento que queremos.
 *
 * Como `sessionStorage` es por pestaña, abrir una pestaña nueva de la misma
 * sesión de navegador pediría login otra vez aunque otra pestaña ya esté
 * autenticada. `ensureBrowserSession$` evita eso: si no hay marca local,
 * pregunta por el canal si alguna pestaña hermana responde antes de mandar a
 * `/login`.
 *
 * La marca local nace en el callback de Auth0 (ver `main.ts`) o al recibir un
 * "pong" de una hermana; la exige `ensureBrowserSession$`, que usan el
 * `authGuard` y `AuthRedirect`.
 */
const browserSessionKey = 'c360.browser-session';
export const BROWSER_SESSION_CHANNEL_NAME = 'c360.browser-session';
export const SIBLING_CHECK_TIMEOUT_MS = 150;

type SiblingMessage = { type: 'ping' } | { type: 'pong' };

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    try {
      channel = new BroadcastChannel(BROWSER_SESSION_CHANNEL_NAME);
    } catch {
      // Navegador sin soporte (o deshabilitado): se degrada a exigir login en
      // cada pestaña nueva, el comportamiento previo a esta mejora.
      channel = null;
    }
  }

  return channel;
}

function setLocalSession(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(browserSessionKey, '1');
    } else {
      sessionStorage.removeItem(browserSessionKey);
    }
  } catch {
    // Ver `isBrowserSessionActive`.
  }
}

export function markBrowserSessionActive(): void {
  setLocalSession(true);
}

export function clearBrowserSession(): void {
  setLocalSession(false);
}

export function isBrowserSessionActive(): boolean {
  try {
    return sessionStorage.getItem(browserSessionKey) === '1';
  } catch {
    // Si el almacenamiento no está disponible no podemos distinguir una
    // sesión nueva de una recargada; devolver `true` evita dejar al usuario
    // en un bucle de login del que no puede salir.
    return true;
  }
}

/**
 * Responde "pong" a cualquier pestaña hermana que pregunte por una sesión
 * activa. Se registra una sola vez al arrancar la aplicación (ver `main.ts`);
 * sin este listener `hasActiveSiblingSession` nunca encontraría respuesta.
 */
export function respondToSiblingSessionPings(): void {
  getChannel()?.addEventListener('message', (event: MessageEvent<SiblingMessage>) => {
    if (event.data.type === 'ping' && isBrowserSessionActive()) {
      getChannel()?.postMessage({ type: 'pong' });
    }
  });
}

/**
 * Pregunta a las pestañas hermanas (mismo origen) si alguna tiene la marca de
 * sesión activa. Se resuelve `false` si nadie responde dentro del plazo, o si
 * el navegador no soporta `BroadcastChannel`.
 */
export function hasActiveSiblingSession(): Observable<boolean> {
  const ch = getChannel();

  if (!ch) {
    return of(false);
  }

  return new Observable<boolean>((subscriber) => {
    const finish = (result: boolean): void => {
      clearTimeout(timer);
      ch.removeEventListener('message', onMessage);
      subscriber.next(result);
      subscriber.complete();
    };

    const onMessage = (event: MessageEvent<SiblingMessage>): void => {
      if (event.data.type === 'pong') {
        finish(true);
      }
    };

    const timer = setTimeout(() => finish(false), SIBLING_CHECK_TIMEOUT_MS);

    ch.addEventListener('message', onMessage);
    ch.postMessage({ type: 'ping' });

    return () => {
      clearTimeout(timer);
      ch.removeEventListener('message', onMessage);
    };
  });
}

/**
 * Punto único que usan `authGuard` y `AuthRedirect` para decidir si esta
 * pestaña cuenta con sesión activa: la marca local si existe o, si no, lo que
 * respondan las pestañas hermanas — y en ese caso la deja marcada localmente
 * para no repetir la pregunta en la siguiente navegación.
 */
export function ensureBrowserSession$(): Observable<boolean> {
  if (isBrowserSessionActive()) {
    return of(true);
  }

  return hasActiveSiblingSession().pipe(
    tap((hasSibling) => {
      if (hasSibling) {
        markBrowserSessionActive();
      }
    }),
  );
}
