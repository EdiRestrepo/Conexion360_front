import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SettingsUser, getSettingsUserDisplayName } from '../../../../../core/models/settings-user.model';

/**
 * El DELETE elimina la cuenta del tenant de Auth0 y no tiene vuelta atrás, así
 * que se exige teclear el correo del usuario para habilitar el botón.
 */
@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './confirm-delete-dialog.html',
  styleUrl: './confirm-delete-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDeleteDialog {
  protected readonly user = inject<SettingsUser>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialog, boolean>);

  protected readonly displayName = getSettingsUserDisplayName(this.user);
  protected readonly confirmControl = new FormControl('', { nonNullable: true });
  private readonly confirmValue = toSignal(this.confirmControl.valueChanges, { initialValue: '' });

  protected get canDelete(): boolean {
    return this.confirmValue().trim().toLowerCase() === this.user.email.trim().toLowerCase();
  }

  protected confirm(): void {
    if (this.canDelete) {
      this.dialogRef.close(true);
    }
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}
