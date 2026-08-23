import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Notification } from '../../../../core/models/notification.model';
import { getNotificationTypeIcon, getNotificationTypeLabel } from '../../../../core/utils/notification-labels';
import { formatNotificationDateTime } from '../../notification-date';

@Component({
  selector: 'app-notification-detail-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './notification-detail-dialog.html',
  styleUrl: './notification-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationDetailDialog {
  protected readonly notification = inject<Notification>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<NotificationDetailDialog, boolean>);

  protected readonly typeLabel = getNotificationTypeLabel(this.notification.type);
  protected readonly typeIcon = getNotificationTypeIcon(this.notification.type);
  protected readonly createdAt = formatNotificationDateTime(this.notification.createdAt);
  protected readonly eventDate = this.notification.eventDate ? formatNotificationDateTime(this.notification.eventDate) : null;

  protected close(): void {
    this.dialogRef.close(false);
  }

  /** Cierra pidiendo al contenedor que navegue al detalle del envío. */
  protected openShipment(): void {
    this.dialogRef.close(true);
  }
}
