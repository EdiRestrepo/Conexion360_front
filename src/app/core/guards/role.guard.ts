import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, switchMap, take } from 'rxjs';

import { UserRole } from '../models/user.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';

export const roleGuard: CanActivateFn = (route) => {
  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const auth0Facade = inject(Auth0FacadeService);
  const router = inject(Router);

  if (allowedRoles.length === 0) {
    return true;
  }

  return auth0Facade.isLoading$.pipe(
    filter((isLoading) => !isLoading),
    take(1),
    switchMap(() => combineLatest([auth0Facade.isAuthenticated$, auth0Facade.user$]).pipe(take(1))),
    map(([isAuthenticated, identity]) => {
      if (!isAuthenticated || !identity) {
        return router.createUrlTree(['/login']);
      }

      const hasAuth0Role = identity.roles.some((role) => allowedRoles.includes(role));

      return hasAuth0Role ? true : router.createUrlTree(['/settings']);
    }),
  );
};
