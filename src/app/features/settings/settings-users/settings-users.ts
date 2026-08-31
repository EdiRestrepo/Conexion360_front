import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs';

import {
  SettingsUser,
  SettingsUserUpdate,
  SettingsUsersPage,
  getSettingsUserDisplayName,
  toSettingsUserUpdate,
} from '../../../core/models/settings-user.model';
import { ApiSettingsUsersService } from '../../../core/services/api-settings-users.service';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { getUserRoleLabel } from '../../../core/utils/display-labels';
import { ConfirmDeleteDialog } from './components/confirm-delete-dialog/confirm-delete-dialog';
import { UserDetailDialog, UserDetailDialogData } from './components/user-detail-dialog/user-detail-dialog';
import type { SettingsUsersFilters, SettingsUsersViewModel } from './models/settings-users-view.model';

const defaultFilters: SettingsUsersFilters = {
  page: 1,
  pageSize: 10,
};

const initialViewModel: SettingsUsersViewModel = {
  state: 'loading',
  filters: defaultFilters,
  users: [],
  totalItems: 0,
  totalPages: 0,
  rangeStart: 0,
  rangeEnd: 0,
};

const pageSizeOptions = [10, 25, 50] as const;

@Component({
  selector: 'app-settings-users',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-users.html',
  styleUrl: './settings-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsUsers {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly usersService = inject(ApiSettingsUsersService);
  private readonly auth0Facade = inject(Auth0FacadeService);

  /** Fuerza una relectura del listado tras editar, bloquear o eliminar. */
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly currentAuth0UserId = signal<string | null>(null);

  protected readonly pageSizeControl = new FormControl<number>(defaultFilters.pageSize, { nonNullable: true });
  protected readonly pageSizeOptions = pageSizeOptions;
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly viewModel$: Observable<SettingsUsersViewModel>;

  protected readonly getUserRoleLabel = getUserRoleLabel;
  protected readonly getDisplayName = getSettingsUserDisplayName;

  constructor() {
    this.auth0Facade.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((identity) => this.currentAuth0UserId.set(identity?.auth0UserId ?? null));

    this.viewModel$ = combineLatest([this.route.queryParamMap, this.refresh$]).pipe(
      map(([params]) => this.getFiltersFromParams(params)),
      tap((filters) => this.patchControls(filters)),
      switchMap((filters) =>
        this.usersService.list(filters.page, filters.pageSize).pipe(
          map((result) => this.createViewModel(result, filters)),
          startWith({ ...initialViewModel, filters } satisfies SettingsUsersViewModel),
          catchError((error: unknown) =>
            of({
              ...initialViewModel,
              state: 'error',
              filters,
              message: getApiErrorMessage(error, 'No fue posible cargar los usuarios.'),
            } satisfies SettingsUsersViewModel),
          ),
        ),
      ),
    );

    this.bindPageSizeControl();
  }

  /** Un admin no puede eliminarse ni bloquearse a sí mismo. */
  protected isSelf(user: SettingsUser): boolean {
    return this.currentAuth0UserId() === user.userId;
  }

  protected openDetail(user: SettingsUser): void {
    this.dialog
      .open<UserDetailDialog, UserDetailDialogData, SettingsUserUpdate | null>(UserDetailDialog, {
        data: { user, isSelf: this.isSelf(user) },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((changes) => {
        if (changes) {
          this.applyUpdate(user, changes, 'Usuario actualizado.');
        }
      });
  }

  protected toggleBlocked(user: SettingsUser): void {
    if (this.isSelf(user)) {
      return;
    }

    const changes: SettingsUserUpdate = { ...toSettingsUserUpdate(user), isBlocked: !user.isBlocked };
    const message = changes.isBlocked ? 'Usuario bloqueado.' : 'Usuario desbloqueado.';

    this.applyUpdate(user, changes, message);
  }

  protected confirmDelete(user: SettingsUser): void {
    if (this.isSelf(user)) {
      return;
    }

    this.dialog
      .open<ConfirmDeleteDialog, SettingsUser, boolean>(ConfirmDeleteDialog, {
        data: user,
        width: '520px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteUser(user);
        }
      });
  }

  protected retry(): void {
    this.refresh$.next();
  }

  protected goToPage(page: number): void {
    void this.updateQueryParams({ page: page <= 1 ? null : page });
  }

  private applyUpdate(user: SettingsUser, changes: SettingsUserUpdate, successMessage: string): void {
    this.actionMessage.set(null);
    this.usersService
      .update(user, changes)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.actionMessage.set(successMessage);
          this.refresh$.next();
        },
        error: (error: unknown) =>
          this.actionMessage.set(getApiErrorMessage(error, 'No fue posible guardar los cambios del usuario.')),
      });
  }

  private deleteUser(user: SettingsUser): void {
    this.actionMessage.set(null);
    this.usersService
      .delete(user.userId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.actionMessage.set(`${getSettingsUserDisplayName(user)} fue eliminado.`);
          this.refresh$.next();
        },
        error: (error: unknown) => this.actionMessage.set(getApiErrorMessage(error, 'No fue posible eliminar el usuario.')),
      });
  }

  private bindPageSizeControl(): void {
    this.pageSizeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((pageSize) => {
        const size = Number(pageSize);
        // El tamaño por defecto no ensucia la URL, igual que en el listado de envíos.
        void this.updateQueryParams({ pageSize: size === defaultFilters.pageSize ? null : size, page: null });
      });
  }

  private createViewModel(result: SettingsUsersPage, filters: SettingsUsersFilters): SettingsUsersViewModel {
    const totalItems = result.totalItems;
    const totalPages = Math.max(result.totalPages, 1);
    const page = Math.min(Math.max(result.page, 1), totalPages);
    const start = (page - 1) * result.pageSize;

    return {
      state: result.items.length === 0 ? 'empty' : 'success',
      filters: { page, pageSize: result.pageSize },
      users: result.items,
      totalItems,
      totalPages,
      rangeStart: totalItems === 0 ? 0 : start + 1,
      rangeEnd: totalItems === 0 ? 0 : Math.min(start + result.items.length, totalItems),
      message: result.items.length === 0 ? 'Todavía no hay usuarios registrados en Auth0.' : undefined,
    };
  }

  private getFiltersFromParams(params: ParamMap): SettingsUsersFilters {
    return {
      page: this.toPositiveNumber(params.get('page'), defaultFilters.page),
      pageSize: this.toPageSize(params.get('pageSize')),
    };
  }

  private patchControls(filters: SettingsUsersFilters): void {
    this.pageSizeControl.setValue(filters.pageSize, { emitEvent: false });
  }

  private updateQueryParams(params: Params): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private toPageSize(value: string | null): number {
    const pageSize = this.toPositiveNumber(value, defaultFilters.pageSize);

    return pageSizeOptions.includes(pageSize as (typeof pageSizeOptions)[number]) ? pageSize : defaultFilters.pageSize;
  }

  private toPositiveNumber(value: string | null, fallback: number): number {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
