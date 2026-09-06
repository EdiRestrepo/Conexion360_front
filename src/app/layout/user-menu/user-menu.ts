import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import type { SettingsUser, SettingsUserUpdate } from '../../core/models/settings-user.model';
import { ApiSettingsUsersService } from '../../core/services/api-settings-users.service';
import { getApiErrorMessage } from '../../core/utils/api-error';
import { getUserRoleLabel } from '../../core/utils/display-labels';
import type { UserDetailDialogData } from '../../features/settings/settings-users/components/user-detail-dialog/user-detail-dialog';

/**
 * Solo el tipo del módulo: `typeof import(...)` no genera dependencia en tiempo
 * de ejecución, así que el diálogo sigue viviendo en su chunk lazy.
 */
type UserDetailDialogModule =
  typeof import('../../features/settings/settings-users/components/user-detail-dialog/user-detail-dialog');

@Component({
  selector: 'app-user-menu',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenu {
  readonly session = input<AuthSession | null>(null);
  readonly compact = input(false);
  /** Muestra nombre y rol junto al avatar. Solo lo usa el sidebar expandido. */
  readonly showIdentity = input(false);
  readonly logout = output<void>();

  private readonly notificationService = inject(NOTIFICATION_DATA_SOURCE);
  private readonly usersService = inject(ApiSettingsUsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly unreadCount$ = this.notificationService.getUnreadCount();

  protected readonly displayName = computed(() => {
    const user = this.session()?.user;
    return user?.name || user?.email || 'Perfil pendiente';
  });

  protected readonly email = computed(() => this.session()?.user.email ?? 'Completa tu perfil');
  protected readonly roleLabel = computed(() => {
    const user = this.session()?.user;
    return user?.role ? getUserRoleLabel(user.role) : 'Rol no asignado en Auth0';
  });
  protected readonly picture = computed(() => this.session()?.user.picture ?? null);
  protected readonly initials = computed(() => this.getInitials(this.displayName()));

  /**
   * Guarda la URL que falló, no un booleano: así una foto nueva vuelve a
   * intentarse en lugar de quedarse descartada para siempre.
   */
  private readonly failedPicture = signal<string | null>(null);

  protected readonly showPicture = computed(() => {
    const picture = this.picture();
    return !!picture && this.failedPicture() !== picture;
  });

  /** Una URL remota siempre puede caducar o dejar de servirse. */
  protected onPictureError(): void {
    this.failedPicture.set(this.picture());
  }

  protected onLogout(): void {
    this.logout.emit();
  }

  /**
   * El diálogo vive en el chunk lazy de `settings-users`; este componente es
   * parte del shell. La promesa se memoiza para no volver a resolver el módulo
   * en cada apertura del menú.
   */
  private dialogModule: Promise<UserDetailDialogModule> | null = null;

  /**
   * Doble función: evita que un doble clic abra dos diálogos encima del mismo
   * usuario y alimenta el anillo de carga del avatar, para que la espera por el
   * backend no parezca un clic perdido.
   */
  protected readonly profilePending = signal(false);

  /**
   * Descarga el chunk al desplegar el menú, no al pulsar la opción: para cuando
   * llega el clic el módulo ya está en memoria y solo se espera al backend.
   */
  protected prefetchProfileDialog(): void {
    void this.loadDialogModule().catch(() => undefined);
  }

  /**
   * Reutiliza el diálogo de `Gestión de usuarios` para que cualquier usuario
   * edite su propio celular y correo. Los endpoints de `/settings` los expone
   * hoy el backend solo para ADMIN (ver AGENTS.md §21): para otros roles esta
   * acción devolverá 403 hasta que el backend habilite el autoservicio.
   */
  protected openProfileDialog(): void {
    const userId = this.session()?.user.id;

    if (!userId || this.profilePending()) {
      return;
    }

    // Chunk y datos van en paralelo: encadenarlos sumaba las dos esperas, y
    // ninguna de las dos depende de la otra.
    const dialogModule = this.loadDialogModule();

    this.profilePending.set(true);

    this.usersService
      .getById(userId)
      .pipe(take(1))
      .subscribe({
        next: (user) => void this.showProfileDialog(dialogModule, user),
        error: (error: unknown) => {
          this.profilePending.set(false);
          this.snackBar.open(getApiErrorMessage(error, 'No fue posible cargar tus datos.'), 'Cerrar', {
            duration: 6000,
          });
        },
      });
  }

  private loadDialogModule(): Promise<UserDetailDialogModule> {
    this.dialogModule ??= import(
      '../../features/settings/settings-users/components/user-detail-dialog/user-detail-dialog'
    );

    return this.dialogModule;
  }

  private async showProfileDialog(dialogModule: Promise<UserDetailDialogModule>, user: SettingsUser): Promise<void> {
    let UserDetailDialog: UserDetailDialogModule['UserDetailDialog'];

    try {
      ({ UserDetailDialog } = await dialogModule);
    } catch {
      // Un chunk que no llegó (red caída, despliegue nuevo) no puede dejar la
      // opción muerta para el resto de la sesión: se olvida y se reintenta.
      this.dialogModule = null;
      this.profilePending.set(false);
      this.snackBar.open('No fue posible abrir el formulario.', 'Cerrar', { duration: 6000 });
      return;
    }

    this.profilePending.set(false);

    this.dialog
      .open<InstanceType<typeof UserDetailDialog>, UserDetailDialogData, SettingsUserUpdate | null>(UserDetailDialog, {
        data: { user, isSelf: true },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((changes) => {
        if (changes) {
          this.applyProfileUpdate(user, changes);
        }
      });
  }

  private applyProfileUpdate(user: SettingsUser, changes: SettingsUserUpdate): void {
    this.usersService
      .update(user, changes)
      .pipe(take(1))
      .subscribe({
        next: () => this.snackBar.open('Datos actualizados.', 'Cerrar', { duration: 4000 }),
        error: (error: unknown) =>
          this.snackBar.open(getApiErrorMessage(error, 'No fue posible guardar los cambios.'), 'Cerrar', { duration: 6000 }),
      });
  }

  private getInitials(value: string): string {
    const parts = value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'C';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }
}
