import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { User as Auth0User } from '@auth0/auth0-spa-js';
import { Observable, combineLatest, map } from 'rxjs';

import { Auth0Identity, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

const rolesClaim = 'https://conexion360.space/roles';
const userMetadataClaim = 'https://conexion360.space/user_metadata';
const documentClaim = 'https://conexion360.space/document';
const companyClaim = 'https://conexion360.space/company';
const fullNameClaim = 'https://conexion360.space/fullName';
const validRoles: readonly UserRole[] = ['CLIENT', 'ADMIN', 'ANALISTAOPE', 'ANALISTASAC'];
const appUrl = environment.appUrl || window.location.origin;
type Auth0Record = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class Auth0FacadeService {
  private readonly auth0 = inject(AuthService);

  readonly isAuthenticated$ = this.auth0.isAuthenticated$;
  readonly isLoading$ = this.auth0.isLoading$;
  readonly authError$ = this.auth0.error$.pipe(map((error) => error.message));
  readonly authorizationUrl = signal<string | null>(null);
  readonly user$: Observable<Auth0Identity | null> = combineLatest([this.auth0.user$, this.auth0.idTokenClaims$]).pipe(
    map(([auth0User, idTokenClaims]) => (auth0User ? this.mapIdentity(auth0User, idTokenClaims) : null)),
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
        returnTo: appUrl,
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

  private mapIdentity(auth0User: Auth0User, idTokenClaims: unknown): Auth0Identity {
    const email = auth0User.email ?? '';
    const auth0Record = {
      ...this.asRecord(auth0User),
      ...this.asRecord(idTokenClaims),
    };
    const userMetadata = {
      ...this.asRecord(auth0Record['user_metadata']),
      ...this.asRecord(auth0Record[userMetadataClaim]),
    };
    const fullName =
      this.readString(auth0Record, fullNameClaim) ||
      this.readString(auth0Record, 'fullName') ||
      this.readString(userMetadata, 'fullName') ||
      this.readString(userMetadata, 'name');
    const document =
      this.readString(auth0Record, documentClaim) ||
      this.readString(auth0Record, 'document') ||
      this.readString(userMetadata, 'document');
    const company =
      this.readString(auth0Record, companyClaim) ||
      this.readString(auth0Record, 'company') ||
      this.readString(userMetadata, 'company');

    return {
      auth0UserId: auth0User.sub ?? email,
      email,
      name: auth0User.name ?? undefined,
      nickname: auth0User.nickname ?? undefined,
      fullName: fullName || undefined,
      document: document || undefined,
      company: company || undefined,
      picture: auth0User.picture ?? undefined,
      roles: this.mapRoles(auth0Record),
    };
  }

  private mapRoles(auth0Record: Auth0Record): UserRole[] {
    const candidate = auth0Record[rolesClaim];

    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.filter((role): role is UserRole =>
      typeof role === 'string' && validRoles.includes(role as UserRole),
    );
  }

  private asRecord(value: unknown): Auth0Record {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Auth0Record) : {};
  }

  private readString(record: Auth0Record, key: string): string {
    const value = record[key];

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return '';
  }
}
