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
import { getApiErrorMessage, isForbiddenError } from '../../core/utils/api-error';
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
    return user?.role ? getUserRoleLabel(user.role) : 'Rol no asignado';
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
   * edite su propio celular y correo.
   *
   * No se consulta `/settings/getuser`: es un endpoint de administración, y
   * además devuelve menos de lo que ya trae el token (sin `user_metadata` ni
   * roles), que es justo de donde salían los `—` del formulario. Con la sesión
   * el diálogo abre sin red y sirve para cualquier rol.
   */
  protected openProfileDialog(): void {
    const user = this.session()?.user;

    if (!user || this.profilePending()) {
      return;
    }

    this.profilePending.set(true);
    void this.showProfileDialog(this.loadDialogModule(), this.toSettingsUser(user));
  }

  /**
   * El `Auth0UserDto` del PATCH exige `userName` y `nickname`, que el token no
   * siempre trae: se caen al correo, que es el identificador de la conexión de
   * base de datos, en vez de mandar vacíos y que el backend los borre.
   */
  private toSettingsUser(user: AuthSession['user']): SettingsUser {
    return {
      userId: user.id,
      email: user.email,
      userName: user.nickname || user.email,
      nickname: user.nickname || user.email,
      phoneNumber: user.phoneNumber ?? '',
      isBlocked: false,
      createdDate: null,
      updatedDate: null,
      fullName: user.name,
      document: user.document ?? '',
      company: user.company ?? '',
      picture: user.picture ?? null,
      role: user.role,
      lastLogin: null,
      emailVerified: null,
      acceptedDataPolicy: null,
    };
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
          this.snackBar.open(this.getProfileErrorMessage(error), 'Cerrar', { duration: 8000 }),
      });
  }

  /**
   * `updateuser` vive bajo `/settings`, que el backend reserva a ADMIN. Hasta
   * que exista un endpoint de autoservicio, un 403 aquí no es un fallo del
   * usuario ni algo que reintentar: se dice qué pasó en vez de volcar el
   * `ProblemDetails` crudo.
   */
  private getProfileErrorMessage(error: unknown): string {
    if (isForbiddenError(error)) {
      return 'Tu cuenta todavía no tiene permiso para editar estos datos. Comunícate a través de la línea telefónica.';
    }

    return getApiErrorMessage(error, 'No fue posible guardar los cambios.');
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
