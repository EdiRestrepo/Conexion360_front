import { Injectable, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { AuthSession } from '../models/auth-session.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { MockUserProfileService } from '../../mocks/services/mock-user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly userProfileService = inject(MockUserProfileService);

  readonly isAuthenticated$ = this.auth0Facade.isAuthenticated$;
  readonly isLoading$ = this.auth0Facade.isLoading$;
  readonly authError$ = this.auth0Facade.authError$;
  readonly authorizationUrl = this.auth0Facade.authorizationUrl;

  readonly currentSession = toSignal(
    combineLatest([this.auth0Facade.user$, toObservable(this.userProfileService.profileChanges)]).pipe(
      switchMap(([identity]) => {
        if (!identity) {
          return of(null);
        }

        return this.userProfileService.getProfileByAuth0Id(identity.auth0UserId).pipe(
          map((profile): AuthSession => {
            const displayName = profile?.fullName || identity.name || identity.nickname || identity.email;

            return {
              user: {
                id: identity.auth0UserId,
                name: displayName,
                email: identity.email,
                role: profile?.role ?? identity.roles[0] ?? 'CLIENT',
                company: profile?.company,
                picture: profile?.picture ?? identity.picture ?? null,
              },
              accessToken: '',
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
            };
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  login(emailOrTarget?: string): Observable<void> {
    return this.auth0Facade.login(emailOrTarget);
  }

  register(email?: string): Observable<void> {
    return this.auth0Facade.signup(email);
  }

  logout(): Observable<void> {
    return this.auth0Facade.logout();
  }

  clearAuthorizationUrl(): void {
    this.auth0Facade.clearAuthorizationUrl();
  }
}
