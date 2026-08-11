import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthSession } from '../../core/models/auth-session.model';
import { layoutNavItems } from '../layout-navigation';
import { UserMenu } from '../user-menu/user-menu';

@Component({
  selector: 'app-sidebar',
  imports: [MatIconModule, RouterLink, RouterLinkActive, UserMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly session = input<AuthSession | null>(null);
  readonly collapsed = input(false);
  readonly logout = output<void>();

  protected readonly navItems = layoutNavItems.filter((item) => item.route !== '/notifications');

  protected onLogout(): void {
    this.logout.emit();
  }
}
