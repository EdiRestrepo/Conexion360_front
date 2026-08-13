import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, catchError } from 'rxjs';

import { AuthSessionService } from '../../services/auth-session.service';

@Component({
  selector: 'app-verify-email',
  imports: [MatIconModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmail {
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  // El Action "Requiere correo verificado" adjunta el correo como query param.
  readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');

  backToLogin(): void {
    this.authSession
      .login('/dashboard')
      .pipe(
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
