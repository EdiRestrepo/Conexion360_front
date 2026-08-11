import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { layoutNavItems } from '../layout-navigation';
import { UserMenu } from '../user-menu/user-menu';

@Component({
  selector: 'app-sidebar',
  imports: [AsyncPipe, MatIconModule, RouterLink, RouterLinkActive, UserMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly session = input<AuthSession | null>(null);
  readonly collapsed = input(false);
  readonly logout = output<void>();

  private readonly notificationService = inject(NOTIFICATION_DATA_SOURCE);

  protected readonly navItems = layoutNavItems;
  protected readonly unreadCount$ = this.notificationService.getUnreadCount();

  protected onLogout(): void {
    this.logout.emit();
  }
}
