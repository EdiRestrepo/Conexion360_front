import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthSession } from '../../core/models/auth-session.model';
import { getUserRoleLabel } from '../../core/utils/display-labels';

@Component({
  selector: 'app-user-menu',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenu {
  readonly session = input<AuthSession | null>(null);
  readonly compact = input(false);
  readonly logout = output<void>();

  protected readonly displayName = computed(() => {
    const user = this.session()?.user;
    return user?.name || user?.email || 'Perfil pendiente';
  });

  protected readonly email = computed(() => this.session()?.user.email ?? 'Completa tu perfil');
  protected readonly roleLabel = computed(() => {
    const user = this.session()?.user;
    return user?.role ? getUserRoleLabel(user.role) : 'Rol no asignado en Auth0';
  });
  protected readonly picture = computed(() => this.session()?.user.picture ?? null);
  protected readonly initials = computed(() => this.getInitials(this.displayName()));

  protected onLogout(): void {
    this.logout.emit();
  }

  private getInitials(value: string): string {
    const parts = value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'C';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }
}
