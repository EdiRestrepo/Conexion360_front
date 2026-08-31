import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  SettingsUser,
  SettingsUserUpdate,
  getSettingsUserDisplayName,
  phoneNumberPattern,
} from '../../../../../core/models/settings-user.model';
import { UserRole } from '../../../../../core/models/user.model';
import { copyToClipboard } from '../../../../../core/utils/clipboard';
import { formatDate, formatDateTime } from '../../../../../core/utils/date-format';
import { getUserRoleLabel } from '../../../../../core/utils/display-labels';
import type { SettingsUserForm } from '../../models/settings-users-view.model';

export interface UserDetailDialogData {
  user: SettingsUser;
  /** El admin no puede bloquearse a sí mismo: perdería el acceso a esta pantalla. */
  isSelf: boolean;
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
  private readonly dialogRef = inject(MatDialogRef<UserDetailDialog, SettingsUserUpdate | null>);

  protected readonly user = this.data.user;
  protected readonly isSelf = this.data.isSelf;
  protected readonly displayName = getSettingsUserDisplayName(this.user);
  protected readonly roleLabel = this.user.role ? getUserRoleLabel(this.user.role) : null;
  protected readonly copied = signal(false);

  protected readonly createdDate = formatDate(this.user.createdDate);
  protected readonly updatedDate = formatDateTime(this.user.updatedDate);
  protected readonly lastLogin = formatDateTime(this.user.lastLogin);

  protected readonly form = new FormGroup<SettingsUserForm>({
    userName: new FormControl(this.user.userName, { nonNullable: true }),
    nickname: new FormControl(this.user.nickname, { nonNullable: true }),
    phoneNumber: new FormControl(this.user.phoneNumber, {
      nonNullable: true,
      validators: [Validators.pattern(phoneNumberPattern)],
    }),
    isBlocked: new FormControl({ value: this.user.isBlocked, disabled: this.isSelf }, { nonNullable: true }),
  });

  /**
   * El rol todavía no viaja en el `Auth0UserDto`, así que el selector queda
   * visible pero deshabilitado: el admin ve qué falta sin creer que lo guardó.
   */
  protected readonly roleControl = new FormControl<UserRole | ''>({ value: this.user.role ?? '', disabled: true }, { nonNullable: true });
  protected readonly roleOptions: UserRole[] = ['CLIENT', 'ADMIN', 'ANALISTAOPE', 'ANALISTASAC'];
  protected readonly getUserRoleLabel = getUserRoleLabel;

  protected get phoneNumberHasError(): boolean {
    const control = this.form.controls.phoneNumber;

    return control.invalid && (control.dirty || control.touched);
  }

  protected copyUserId(): void {
    void copyToClipboard(this.user.userId).then((ok) => this.copied.set(ok));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { userName, nickname, phoneNumber, isBlocked } = this.form.getRawValue();

    this.dialogRef.close({
      userId: this.user.userId,
      email: this.user.email,
      userName: userName.trim(),
      nickname: nickname.trim(),
      phoneNumber: phoneNumber.trim(),
      isBlocked,
    });
  }

  protected close(): void {
    this.dialogRef.close(null);
  }
}
