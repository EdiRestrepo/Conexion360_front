import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, of, switchMap, take } from 'rxjs';

import { Auth0FacadeService } from '../services/auth0-facade.service';

export const authGuard: CanActivateFn | CanActivateChildFn = () => {
  const auth0Facade = inject(Auth0FacadeService);
  const router = inject(Router);

  return auth0Facade.isLoading$.pipe(
    filter((isLoading) => !isLoading),
    take(1),
    switchMap(() => combineLatest([auth0Facade.isAuthenticated$, auth0Facade.user$]).pipe(take(1))),
    map(([isAuthenticated, identity]) => (isAuthenticated && identity ? true : router.createUrlTree(['/login']))),
  );
};
