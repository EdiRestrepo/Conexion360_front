import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { markBrowserSessionActive, respondToSiblingSessionPings } from './app/core/utils/browser-session';
import { writeLastActivity } from './app/core/utils/idle-activity';

// Se registra siempre, para poder responder "pong" a una pestaña hermana que
// pregunte por sesión activa aunque esta pestaña haya arrancado antes que
// aquella (ver `browser-session.ts`).
respondToSiblingSessionPings();

// El regreso desde Auth0 (`?code=&state=`) es el único punto donde nace una
// sesión de navegador. Se marca antes de `bootstrapApplication` porque el SDK
// consume y limpia esos parámetros durante su inicialización.
const callbackParams = new URLSearchParams(window.location.search);

if (callbackParams.has('code') && callbackParams.has('state')) {
  markBrowserSessionActive();
  // La cuenta de inactividad arranca aquí, no en `IdleSessionService.start()`:
  // ese corre en cada F5, y sembrarla allí dejaría revivir con una recarga una
  // sesión ya vencida (ver `idle-activity.ts`).
  writeLastActivity(Date.now());
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
