import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SettingsUser, SettingsUserUpdate, phoneNumberPattern } from '../../../../../core/models/settings-user.model';
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
  protected readonly roleLabel = this.user.role ? getUserRoleLabel(this.user.role) : null;

  protected readonly form = new FormGroup<SettingsUserForm>({
    phoneNumber: new FormControl(this.user.phoneNumber, {
      nonNullable: true,
      validators: [Validators.pattern(phoneNumberPattern)],
    }),
    email: new FormControl(this.user.email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    isBlocked: new FormControl({ value: this.user.isBlocked, disabled: this.isSelf }, { nonNullable: true }),
  });

  protected get phoneNumberHasError(): boolean {
    const control = this.form.controls.phoneNumber;

    return control.invalid && (control.dirty || control.touched);
  }

  protected get emailHasError(): boolean {
    const control = this.form.controls.email;

    return control.invalid && (control.dirty || control.touched);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { phoneNumber, email, isBlocked } = this.form.getRawValue();

    this.dialogRef.close({
      userId: this.user.userId,
      // `userName`/`nickname` ya no se editan aquí (no aparecen en la tabla),
      // pero el PATCH del Auth0UserDto los sigue exigiendo: se reenvían tal cual.
      userName: this.user.userName,
      nickname: this.user.nickname,
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      isBlocked,
    });
  }

  protected close(): void {
    this.dialogRef.close(null);
  }
}
