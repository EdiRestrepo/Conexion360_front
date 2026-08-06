import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, debounceTime, map, of, startWith, switchMap, take } from 'rxjs';

import { SettingsUser, SettingsViewState } from '../../../core/models/settings.model';
import { SettingsService } from '../../../core/services/settings.service';
import { UserRole } from '../../../core/models/user.model';
import { getUserRoleLabel } from '../../../core/utils/display-labels';

interface UsersViewModel {
  state: SettingsViewState;
  users: SettingsUser[];
  message?: string;
}

@Component({
  selector: 'app-settings-users',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-users.html',
  styleUrl: './settings-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsUsers {
  private readonly settingsService = inject(SettingsService);
  private readonly reload$ = new Subject<void>();

  protected readonly queryControl = new FormControl('', { nonNullable: true });
  protected readonly roleControl = new FormControl<UserRole | 'ALL'>('ALL', { nonNullable: true });
  protected readonly inviteEmailControl = new FormControl('', { nonNullable: true, validators: [Validators.email] });
  protected readonly inviteRoleControl = new FormControl<UserRole>('CLIENT', { nonNullable: true });
  protected readonly saveMessage = signal<string | null>(null);
  protected readonly inviteMessage = signal<string | null>(null);
  protected readonly roles: (UserRole | 'ALL')[] = ['ALL', 'CLIENT', 'ANALISTAOPE', 'ANALISTASAC', 'ADMIN'];
  protected readonly inviteRoles: UserRole[] = ['CLIENT', 'ANALISTAOPE', 'ANALISTASAC', 'ADMIN'];
  protected readonly viewModel$: Observable<UsersViewModel> = combineLatest([
    this.queryControl.valueChanges.pipe(startWith(this.queryControl.value), debounceTime(250)),
    this.roleControl.valueChanges.pipe(startWith(this.roleControl.value)),
    this.reload$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([query, role]) =>
      this.settingsService.searchUsers(query, role).pipe(
        map((users) => ({
          state: users.length ? 'success' : 'empty',
          users,
          message: users.length ? undefined : 'No hay usuarios disponibles para mostrar.',
        } satisfies UsersViewModel)),
        startWith({ state: 'loading', users: [] } satisfies UsersViewModel),
        catchError(() => of({ state: 'error', users: [], message: 'No fue posible cargar usuarios.' } satisfies UsersViewModel)),
      ),
    ),
  );

  protected getRoleLabel(role: UserRole | 'ALL'): string {
    return role === 'ALL' ? 'Todos los roles' : getUserRoleLabel(role);
  }

  protected getStatusLabel(user: SettingsUser): string {
    return user.status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  protected getInitials(user: SettingsUser): string {
    return user.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join('');
  }

  protected sendInvitation(): void {
    const email = this.inviteEmailControl.value.trim();

    if (!email || this.inviteEmailControl.invalid) {
      this.inviteEmailControl.markAsTouched();
      this.inviteMessage.set('Ingresa un correo válido para enviar la invitación.');
      return;
    }

    this.inviteMessage.set(`Invitación preparada para ${email} con rol ${this.getRoleLabel(this.inviteRoleControl.value)}.`);
    this.inviteEmailControl.setValue('');
    this.inviteRoleControl.setValue('CLIENT');
  }

  protected toggleUser(user: SettingsUser): void {
    this.saveMessage.set(null);
    this.settingsService
      .toggleUserStatus(user.id)
      .pipe(take(1))
      .subscribe({
        next: (updatedUser) => {
          this.saveMessage.set(updatedUser ? 'Actualización guardada.' : 'No se encontró el usuario seleccionado.');
          this.reload$.next();
        },
        error: () => this.saveMessage.set('No fue posible actualizar el usuario.'),
      });
  }
}
