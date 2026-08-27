import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject, Observable, Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { Notification } from '../../core/models/notification.model';
import { NotificationsHubService } from '../../core/services/notifications-hub.service';
import { getNotificationTypeIcon } from '../../core/utils/notification-labels';
import { NotificationDetailDialog } from './components/notification-detail-dialog/notification-detail-dialog';
import { formatNotificationDateTime } from './notification-date';
import type { NotificationFilter, NotificationsViewModel } from './models/notifications-view.model';

const initialViewModel: NotificationsViewModel = {
  state: 'loading',
  notifications: [],
  filter: 'all',
};

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notifications {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NOTIFICATION_DATA_SOURCE);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly hub = inject(NotificationsHubService);
  private readonly filter$ = new BehaviorSubject<NotificationFilter>('all');
  private readonly refresh$ = new Subject<void>();

  /** Estado de la conexión SignalR, para saber si el tiempo real está vivo. */
  protected readonly realtimeState$ = this.hub.state$;
  /** Avisos entregados por el Hub; se muestra junto al estado mientras se depura. */
  protected readonly realtimeCount$ = this.hub.receivedCount$;

  protected readonly viewModel$: Observable<NotificationsViewModel> = combineLatest([
    this.filter$,
    this.refresh$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([filter]) =>
      this.notificationService.getAll().pipe(
        map((notifications) => this.createViewModel(notifications, filter)),
        startWith({ ...initialViewModel, filter } satisfies NotificationsViewModel),
        catchError(() =>
          of({
            ...initialViewModel,
            state: 'error',
            filter,
            message: 'No fue posible cargar las notificaciones. Intenta nuevamente.',
          } satisfies NotificationsViewModel),
        ),
      ),
    ),
  );

  protected readonly getNotificationTypeIcon = getNotificationTypeIcon;
  protected readonly formatDateTime = formatNotificationDateTime;

  protected setFilter(filter: NotificationFilter): void {
    this.filter$.next(filter);
  }

  protected retry(): void {
    this.notificationService.reload();
    this.refresh$.next();
  }

  /**
   * Abrir el detalle es lo que marca la notificación como leída: se muestra el
   * mensaje completo en un modal y, si el usuario lo pide, se navega al envío.
   */
  protected openDetail(notification: Notification): void {
    this.markAsRead(notification);

    this.dialog
      .open(NotificationDetailDialog, { data: notification, width: '32rem', maxWidth: '92vw', autoFocus: 'dialog' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((openShipment) => {
        if (openShipment && notification.shipmentDocument) {
          void this.router.navigate(['/shipments', notification.shipmentDocument], {
            queryParams: { document: notification.shipmentDocument },
          });
        }
      });
  }

  private markAsRead(notification: Notification): void {
    if (notification.read) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh$.next());
  }

  private createViewModel(notifications: Notification[], filter: NotificationFilter): NotificationsViewModel {
    const sortedNotifications = [...notifications].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    const filteredNotifications = filter === 'unread' ? sortedNotifications.filter((notification) => !notification.read) : sortedNotifications;

    return {
      state: filteredNotifications.length === 0 ? 'empty' : 'success',
      notifications: filteredNotifications,
      filter,
      message: notifications.length === 0 ? 'No hay notificaciones para mostrar.' : 'No hay notificaciones no leídas.',
    };
  }
}
