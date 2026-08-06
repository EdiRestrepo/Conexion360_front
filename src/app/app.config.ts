import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const appUrl = environment.appUrl || window.location.origin;
const apiAllowedList = environment.api.baseUrl
  ? [
      {
        uri: `${environment.api.baseUrl}/*`,
        tokenOptions: {
          authorizationParams: {
            audience: environment.auth0.audience,
            scope: environment.auth0.scope,
          },
        },
      },
    ]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: appUrl,
        audience: environment.auth0.audience,
        scope: environment.auth0.scope,
      },
      httpInterceptor: {
        allowedList: apiAllowedList,
      },
      cacheLocation: 'localstorage',
    }),
    provideAnimationsAsync(),
  ],
};
