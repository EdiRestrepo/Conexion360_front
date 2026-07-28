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

interface SettingsCardView extends SettingsCard {
  available: boolean;
}

const settingsCards: SettingsCard[] = [
  {
    title: 'Ajuste de notificaciones',
    description: 'Configura canales y eventos para recibir alertas de tus envíos.',
    icon: 'notifications_active',
    route: '/settings/notifications',
    roles: ['CLIENT', 'OPERATOR', 'ADMIN'],
  },
  {
    title: 'Gestión de usuarios',
    description: 'Administra usuarios, roles y estados de acceso a la plataforma.',
    icon: 'group',
    route: '/settings/users',
    roles: ['ADMIN'],
  },
  {
    title: 'Ajustes maestros',
    description: 'Parametriza catálogos y configuraciones globales del sistema.',
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
  protected readonly currentRole = computed(() => this.session()?.user.role ?? 'CLIENT');
  protected readonly cards = computed<SettingsCardView[]>(() => {
    const role = this.currentRole();
    return settingsCards.map((card) => ({ ...card, available: card.roles.includes(role) }));
  });

  protected getRoleLabel(role: UserRole): string {
    return getUserRoleLabel(role);
  }
}