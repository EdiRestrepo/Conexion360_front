import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, map, of, startWith } from 'rxjs';

import {
  SettingsRole,
  SettingsUser,
  SettingsUserUpdate,
  getSettingsUserPhone,
  toSettingsUserUpdate,
} from '../../../../../core/models/settings-user.model';
import { formatDateTime } from '../../../../../core/utils/date-format';
import { getRoleNameLabel } from '../../../../../core/utils/display-labels';
import { getVisibleErrorMessage } from '../../../../../core/utils/input-error-message';
import { inputRules } from '../../../../../core/utils/input-rules';
import { validatorsFor } from '../../../../../core/utils/input-validators';
import type { SettingsUserForm } from '../../models/settings-users-view.model';

export interface UserDetailDialogData {
  user: SettingsUser;
  /** El admin no puede bloquearse ni cambiarse el rol: perdería el acceso a esta pantalla. */
  isSelf: boolean;
  /** Solo lo pasa `Gestión de usuarios`; sin él, el rol se muestra de solo lectura. */
  roles$?: Observable<SettingsRole[]>;
}

/**
 * Perfil y estado viajan por endpoints distintos (`updateuser` y
 * `updateuserstatus`), así que se devuelven por separado. `null` = sin cambios.
 */
export interface UserDetailDialogResult {
  profile: SettingsUserUpdate | null;
  isActive: boolean | null;
}

interface RolesState {
  state: 'readonly' | 'loading' | 'ready' | 'error';
  roles: SettingsRole[];
}

@Component({
  selector: 'app-user-detail-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './user-detail-dialog.html',
  styleUrl: './user-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailDialog {
  private readonly data = inject<UserDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<UserDetailDialog, UserDetailDialogResult | null>);

  protected readonly user = this.data.user;
  protected readonly isSelf = this.data.isSelf;
  protected readonly roleLabel = this.user.roleName ? getRoleNameLabel(this.user.roleName) : null;
  protected readonly createdDate = formatDateTime(this.user.createdDate);
  protected readonly updatedDate = formatDateTime(this.user.updatedDate);
  protected readonly rules = inputRules;
  protected readonly getRoleNameLabel = getRoleNameLabel;

  protected readonly form = new FormGroup<SettingsUserForm>({
    fullName: new FormControl(this.user.fullName, {
      nonNullable: true,
      validators: validatorsFor(inputRules.personName),
    }),
    company: new FormControl(this.user.company, {
      nonNullable: true,
      validators: validatorsFor(inputRules.companyName),
    }),
    phone: new FormControl(getSettingsUserPhone(this.user), {
      nonNullable: true,
      validators: validatorsFor(inputRules.phone),
    }),
    email: new FormControl(this.user.email, {
      nonNullable: true,
      validators: validatorsFor(inputRules.email),
    }),
    roleId: new FormControl(this.user.roleId, { nonNullable: true }),
    isActive: new FormControl({ value: !this.user.isBlocked, disabled: this.isSelf }, { nonNullable: true }),
  });

  /** Alimenta el texto de apoyo del checkbox sin romper OnPush. */
  protected readonly isActive = toSignal(this.form.controls.isActive.valueChanges, {
    initialValue: !this.user.isBlocked,
  });

  protected readonly rolesState = toSignal(this.loadRoles(), { requireSync: true });

  /**
   * Mientras los roles cargan (o si fallan) el selector ofrece solo el actual:
   * así el formulario se puede guardar igual sin arriesgar el rol del usuario.
   */
  protected readonly roleOptions = computed<SettingsRole[]>(() => {
    const { state, roles } = this.rolesState();

    if (state === 'ready') {
      return roles;
    }

    return this.user.roleId ? [{ id: this.user.roleId, name: this.user.roleName, description: '' }] : [];
  });

  protected get fullNameError(): string | null {
    return getVisibleErrorMessage(this.form.controls.fullName, inputRules.personName);
  }

  protected get companyError(): string | null {
    return getVisibleErrorMessage(this.form.controls.company, inputRules.companyName);
  }

  protected get phoneError(): string | null {
    return getVisibleErrorMessage(this.form.controls.phone, inputRules.phone);
  }

  protected get emailError(): string | null {
    return getVisibleErrorMessage(this.form.controls.email, inputRules.email);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, company, phone, email, roleId, isActive } = this.form.getRawValue();
    const original = toSettingsUserUpdate(this.user);
    const profile: SettingsUserUpdate = {
      ...original,
      fullName: fullName.trim(),
      company: company.trim(),
      // El celular editable es el del registro (`phone`); `phoneNumber` es la
      // raíz de Auth0 y se reenvía tal cual, para no tocar lo que no se ve.
      phone: phone.trim(),
      email: email.trim(),
      roleId: roleId || null,
      roleName: this.findRoleName(roleId),
    };
    const profileChanged = (['fullName', 'company', 'phone', 'email', 'roleId'] as const).some(
      (key) => profile[key] !== original[key],
    );
    const statusChanged = !this.isSelf && isActive === this.user.isBlocked;

    if (!profileChanged && !statusChanged) {
      this.dialogRef.close(null);
      return;
    }

    this.dialogRef.close({
      profile: profileChanged ? profile : null,
      isActive: statusChanged ? isActive : null,
    });
  }

  protected close(): void {
    this.dialogRef.close(null);
  }

  private findRoleName(roleId: string): string {
    return this.roleOptions().find((role) => role.id === roleId)?.name ?? this.user.roleName;
  }

  private loadRoles(): Observable<RolesState> {
    if (!this.data.roles$ || this.isSelf) {
      return of({ state: 'readonly', roles: [] });
    }

    return this.data.roles$.pipe(
      map((roles): RolesState => ({ state: 'ready', roles })),
      catchError(() => of<RolesState>({ state: 'error', roles: [] })),
      startWith<RolesState>({ state: 'loading', roles: [] }),
    );
  }
}
