import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject, Observable, Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { Notification, NotificationType } from '../../core/models/notification.model';
import {
  NotificationTone,
  getNotificationTone,
  getNotificationTypeIcon,
  getNotificationTypeLabel,
} from '../../core/utils/notification-labels';
import { MockNotificationService } from '../../mocks/services/mock-notification.service';
import type { NotificationFilter, NotificationsViewModel } from './models/notifications-view.model';

const initialViewModel: NotificationsViewModel = {
  state: 'loading',
  notifications: [],
  unreadCount: 0,
  filter: 'all',
};

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notifications {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(MockNotificationService);
  private readonly filter$ = new BehaviorSubject<NotificationFilter>('all');
  private readonly refresh$ = new Subject<void>();

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
  protected readonly getNotificationTypeLabel = getNotificationTypeLabel;

  protected setFilter(filter: NotificationFilter): void {
    this.filter$.next(filter);
  }

  protected retry(): void {
    this.refresh$.next();
  }

  protected markAsRead(notification: Notification): void {
    if (notification.read) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh$.next());
  }

  protected markAllAsRead(): void {
    this.notificationService
      .markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh$.next());
  }

  protected getToneClass(type: NotificationType): string {
    const classes: Record<NotificationTone, string> = {
      info: 'notification-item--info',
      warning: 'notification-item--warning',
      success: 'notification-item--success',
    };

    return classes[getNotificationTone(type)];
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(date);
  }

  private createViewModel(notifications: Notification[], filter: NotificationFilter): NotificationsViewModel {
    const sortedNotifications = [...notifications].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    const filteredNotifications = filter === 'unread' ? sortedNotifications.filter((notification) => !notification.read) : sortedNotifications;
    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return {
      state: notifications.length === 0 || filteredNotifications.length === 0 ? 'empty' : 'success',
      notifications: filteredNotifications,
      unreadCount,
      filter,
      message: notifications.length === 0 ? 'No hay notificaciones simuladas para mostrar.' : 'No hay notificaciones no leídas.',
    };
  }
}
