import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';

import { AuthSession } from '../models/auth-session.model';
import { Auth0FacadeService } from './auth0-facade.service';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly auth0Facade = inject(Auth0FacadeService);

  readonly isAuthenticated$ = this.auth0Facade.isAuthenticated$;
  readonly isLoading$ = this.auth0Facade.isLoading$;
  readonly authError$ = this.auth0Facade.authError$;
  readonly authorizationUrl = this.auth0Facade.authorizationUrl;

  readonly currentSession = toSignal(
    this.auth0Facade.user$.pipe(
      map((identity): AuthSession | null => {
        if (!identity) {
          return null;
        }

        const displayName = identity.fullName || identity.name || identity.nickname || identity.email;

        return {
          user: {
            id: identity.auth0UserId,
            name: displayName,
            email: identity.email,
            role: identity.roles[0] ?? null,
            document: identity.document,
            company: identity.company,
            picture: identity.picture ?? null,
          },
          accessToken: '',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
        };
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
