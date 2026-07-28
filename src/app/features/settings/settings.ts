import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { UserRole } from '../../core/models/user.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { getUserRoleLabel } from '../../core/utils/display-labels';

interface SettingsCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

const settingsCards: SettingsCard[] = [
  {
    title: 'Ajuste de notificaciones',
    description: 'Define alertas por correo, plataforma y eventos logísticos.',
    icon: 'notifications_active',
    route: '/settings/notifications',
    roles: ['CLIENT', 'OPERATOR', 'ADMIN'],
  },
  {
    title: 'Gestión de usuarios',
    description: 'Administra usuarios, roles y estados de acceso simulados.',
    icon: 'manage_accounts',
    route: '/settings/users',
    roles: ['ADMIN'],
  },
  {
    title: 'Ajustes maestros',
    description: 'Consulta catálogos operativos usados por el prototipo.',
    icon: 'tune',
    route: '/settings/master-data',
    roles: ['ADMIN'],
  },
];

@Component({
  selector: 'app-settings',
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly authSession = inject(AuthSessionService);

  protected readonly session = this.authSession.currentSession;
  protected readonly cards = computed(() => {
    const role = this.session()?.user.role ?? 'CLIENT';
    return settingsCards.filter((card) => card.roles.includes(role));
  });

  protected getRoleLabel(role: UserRole): string {
    return getUserRoleLabel(role);
  }
}
