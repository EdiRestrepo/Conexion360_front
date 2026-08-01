import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, of, switchMap, take } from 'rxjs';

import { MockUserProfileService } from '../../mocks/services/mock-user-profile.service';
import { UserRole } from '../models/user.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';

export const roleGuard: CanActivateFn = (route) => {
  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const auth0Facade = inject(Auth0FacadeService);
  const userProfileService = inject(MockUserProfileService);
  const router = inject(Router);

  if (allowedRoles.length === 0) {
    return true;
  }

  return auth0Facade.isLoading$.pipe(
    filter((isLoading) => !isLoading),
    take(1),
    switchMap(() => combineLatest([auth0Facade.isAuthenticated$, auth0Facade.user$]).pipe(take(1))),
    switchMap(([isAuthenticated, identity]) => {
      if (!isAuthenticated || !identity) {
        return of(router.createUrlTree(['/login']));
      }

      const hasAuth0Role = identity.roles.some((role) => allowedRoles.includes(role));

      if (hasAuth0Role) {
        return of(true);
      }

      return userProfileService.completeProfileFromIdentity(identity).pipe(
        map((profile) => (profile && allowedRoles.includes(profile.role) ? true : router.createUrlTree(['/settings']))),
      );
    }),
  );
};
