import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type SessionTimeoutChoice = 'stay' | 'logout';

export interface SessionTimeoutDialogData {
  /** Cuenta atrás viva, la publica `IdleSessionService`. */
  remainingSeconds: Signal<number>;
}

/**
 * Aviso previo al cierre de sesión por inactividad.
 *
 * No es un adorno: `/login` no es una pantalla propia sino una redirección
 * inmediata a Auth0 (ver `AuthRedirect`), así que este diálogo es el único
 * lugar donde el usuario puede enterarse de por qué se va a cerrar su sesión
 * —y recuperarla sin perder lo que tuviera a medio escribir—.
 *
 * Recibe la señal de la cuenta atrás por `MAT_DIALOG_DATA` en vez de inyectar
 * `IdleSessionService`: así el diálogo no sabe nada del temporizador y su
 * prueba se monta con un `signal(47)` plano.
 */
@Component({
  selector: 'app-session-timeout-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './session-timeout-dialog.html',
  styleUrl: './session-timeout-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTimeoutDialog {
  private readonly data = inject<SessionTimeoutDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SessionTimeoutDialog, SessionTimeoutChoice>);

  protected readonly countdown = computed(() => {
    const total = Math.max(0, this.data.remainingSeconds());
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  protected stay(): void {
    this.dialogRef.close('stay');
  }

  protected logout(): void {
    this.dialogRef.close('logout');
  }
}
