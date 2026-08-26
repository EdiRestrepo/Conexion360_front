import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, of, switchMap, take } from 'rxjs';

import { Auth0FacadeService } from '../services/auth0-facade.service';
import { ensureBrowserSession$ } from '../utils/browser-session';

export const authGuard: CanActivateFn | CanActivateChildFn = () => {
  const auth0Facade = inject(Auth0FacadeService);
  const router = inject(Router);

  return auth0Facade.isLoading$.pipe(
    filter((isLoading) => !isLoading),
    take(1),
    switchMap(() => combineLatest([auth0Facade.isAuthenticated$, auth0Facade.user$]).pipe(take(1))),
    switchMap(([isAuthenticated, identity]) => {
      if (!isAuthenticated || !identity) {
        return of(router.createUrlTree(['/login']));
      }

      // La caché de Auth0 vive en `localStorage` y sobrevive al cierre del
      // navegador: sin una sesión de navegador (propia o de una pestaña
      // hermana), abrir la aplicación pasa siempre por `/login` aunque esa
      // caché siga vigente.
      return ensureBrowserSession$().pipe(
        map((hasSession) => (hasSession ? true : router.createUrlTree(['/login']))),
      );
    }),
  );
};
