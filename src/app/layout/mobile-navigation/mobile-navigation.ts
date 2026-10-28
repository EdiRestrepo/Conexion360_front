import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthSession } from '../../core/models/auth-session.model';
import { layoutNavItems } from '../layout-navigation';
import { UserMenu } from '../user-menu/user-menu';

@Component({
  selector: 'app-mobile-navigation',
  imports: [MatButtonModule, MatIconModule, RouterLink, RouterLinkActive, UserMenu],
  templateUrl: './mobile-navigation.html',
  styleUrl: './mobile-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavigation {
  readonly open = input(false);
  readonly session = input<AuthSession | null>(null);
  readonly closed = output<void>();
  readonly logout = output<void>();

  protected readonly navItems = layoutNavItems;

  protected closeNavigation(): void {
    this.closed.emit();
  }

  protected onLogout(): void {
    this.logout.emit();
  }
}
