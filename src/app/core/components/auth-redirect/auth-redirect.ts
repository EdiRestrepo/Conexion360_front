import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, filter, switchMap, take } from 'rxjs';

import { AuthSessionService } from '../../services/auth-session.service';
import { ensureBrowserSession$ } from '../../utils/browser-session';

type AuthRedirectMode = 'login' | 'signup';

@Component({
  selector: 'app-auth-redirect',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRedirect {
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const mode = this.getMode();

    this.authSession.isLoading$
      .pipe(
        filter((isLoading) => !isLoading),
        take(1),
        switchMap(() => this.authSession.isAuthenticated$.pipe(take(1))),
        switchMap((isAuthenticated) => {
          if (!isAuthenticated) {
            return mode === 'signup' ? this.authSession.register() : this.authSession.login('/dashboard');
          }

          // La caché de Auth0 puede seguir viva tras cerrar el navegador; sin
          // una sesión de navegador (propia o de una pestaña hermana) hay que
          // rehacer el login, o el `authGuard` devolvería aquí en bucle.
          return ensureBrowserSession$().pipe(
            switchMap((hasSession) => {
              if (hasSession) {
                void this.router.navigate(['/dashboard']);
                return EMPTY;
              }

              return mode === 'signup' ? this.authSession.register() : this.authSession.login('/dashboard');
            }),
          );
        }),
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private getMode(): AuthRedirectMode {
    return this.route.snapshot.data['mode'] === 'signup' ? 'signup' : 'login';
  }
}