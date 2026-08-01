import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { User as Auth0User } from '@auth0/auth0-spa-js';
import { Observable, map } from 'rxjs';

import { UserRole } from '../models/user.model';
import { Auth0Identity } from '../models/user-profile.model';
import { environment } from '../../../environments/environment';

const rolesClaim = 'https://conexion360.space/roles';
const validRoles: readonly UserRole[] = ['CLIENT', 'OPERATOR', 'ADMIN'];

@Injectable({
  providedIn: 'root',
})
export class Auth0FacadeService {
  private readonly auth0 = inject(AuthService);

  readonly isAuthenticated$ = this.auth0.isAuthenticated$;
  readonly isLoading$ = this.auth0.isLoading$;
  readonly authError$ = this.auth0.error$.pipe(map((error) => error.message));
  readonly authorizationUrl = signal<string | null>(null);
  readonly user$: Observable<Auth0Identity | null> = this.auth0.user$.pipe(
    map((auth0User) => (auth0User ? this.mapIdentity(auth0User) : null)),
  );

  login(emailOrTarget?: string): Observable<void> {
    const isRouteTarget = emailOrTarget?.startsWith('/');
    const target = isRouteTarget && emailOrTarget ? emailOrTarget : '/dashboard';

    this.authorizationUrl.set(null);

    return this.auth0.loginWithRedirect({
      appState: { target },
      authorizationParams: {
        login_hint: !isRouteTarget ? emailOrTarget?.trim() || undefined : undefined,
        audience: environment.auth0.audience,
        scope: environment.auth0.scope,
        prompt: 'login',
      },
      openUrl: (url) => this.openAuth0(url),
    });
  }

  signup(email?: string): Observable<void> {
    this.authorizationUrl.set(null);

    return this.auth0.loginWithRedirect({
      appState: { target: '/dashboard' },
      authorizationParams: {
        login_hint: email?.trim() || undefined,
        screen_hint: 'signup',
        audience: environment.auth0.audience,
        scope: environment.auth0.scope,
        prompt: 'login',
      },
      openUrl: (url) => this.openAuth0(url),
    });
  }

  logout(): Observable<void> {
    return this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  clearAuthorizationUrl(): void {
    this.authorizationUrl.set(null);
  }

  private openAuth0(url: string): void {
    this.authorizationUrl.set(url);

    const auth0Link = document.createElement('a');
    auth0Link.href = url;
    auth0Link.target = '_self';
    auth0Link.hidden = true;
    document.body.appendChild(auth0Link);
    auth0Link.click();
    auth0Link.remove();
  }

  private mapIdentity(auth0User: Auth0User): Auth0Identity {
    const email = auth0User.email ?? '';

    return {
      auth0UserId: auth0User.sub ?? email,
      email,
      name: auth0User.name ?? undefined,
      nickname: auth0User.nickname ?? undefined,
      picture: auth0User.picture ?? undefined,
      roles: this.mapRoles(auth0User),
    };
  }

  private mapRoles(auth0User: Auth0User): UserRole[] {
    const candidate = (auth0User as Record<string, unknown>)[rolesClaim];

    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.filter((role): role is UserRole =>
      typeof role === 'string' && validRoles.includes(role as UserRole),
    );
  }
}
