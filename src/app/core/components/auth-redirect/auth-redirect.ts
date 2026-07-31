import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, filter, switchMap, take } from 'rxjs';

import { AuthSessionService } from '../../services/auth-session.service';

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
          if (isAuthenticated) {
            void this.router.navigate(['/dashboard']);
            return EMPTY;
          }

          return mode === 'signup' ? this.authSession.register() : this.authSession.login('/dashboard');
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