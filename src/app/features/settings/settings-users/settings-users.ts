import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, catchError, combineLatest, debounceTime, map, of, startWith, switchMap, take, tap } from 'rxjs';

import { SettingsViewState, SimulatedUser } from '../../../core/models/settings.model';
import { UserRole } from '../../../core/models/user.model';
import { getUserRoleLabel } from '../../../core/utils/display-labels';
import { MockSettingsService } from '../../../mocks/services/mock-settings.service';

interface UsersViewModel {
  state: SettingsViewState;
  users: SimulatedUser[];
  message?: string;
}

@Component({
  selector: 'app-settings-users',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './settings-users.html',
  styleUrl: './settings-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsUsers {
  private readonly settingsService = inject(MockSettingsService);
  private readonly reload$ = new Subject<void>();

  protected readonly queryControl = new FormControl('', { nonNullable: true });
  protected readonly roleControl = new FormControl<UserRole | 'ALL'>('ALL', { nonNullable: true });
  protected readonly saveMessage = signal<string | null>(null);
  protected readonly roles: (UserRole | 'ALL')[] = ['ALL', 'CLIENT', 'OPERATOR', 'ADMIN'];
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
          message: users.length ? undefined : 'No hay usuarios que coincidan con los filtros.',
        } satisfies UsersViewModel)),
        startWith({ state: 'loading', users: [] } satisfies UsersViewModel),
        catchError(() => of({ state: 'error', users: [], message: 'No fue posible cargar usuarios.' } satisfies UsersViewModel)),
      ),
    ),
  );

  protected getRoleLabel(role: UserRole | 'ALL'): string {
    return role === 'ALL' ? 'Todos los roles' : getUserRoleLabel(role);
  }

  protected getStatusLabel(user: SimulatedUser): string {
    return user.status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  protected toggleUser(user: SimulatedUser): void {
    this.saveMessage.set(null);
    this.settingsService
      .toggleUserStatus(user.id)
      .pipe(take(1))
      .subscribe({
        next: (updatedUser) => {
          this.saveMessage.set(updatedUser ? 'Actualización simulada guardada.' : 'No se encontró el usuario seleccionado.');
          this.reload$.next();
        },
        error: () => this.saveMessage.set('No fue posible actualizar el usuario.'),
      });
  }
}
