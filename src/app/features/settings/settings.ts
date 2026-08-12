import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthSessionService } from '../../core/services/auth-session.service';
import type { SettingsCard, SettingsCardView } from './models/settings-view.model';

const settingsCards: SettingsCard[] = [
  {
    title: 'Ajuste de notificaciones',
    description: 'Configura canales y eventos para recibir alertas de tus envíos.',
    icon: 'notifications_active',
    route: '/settings/notifications',
    roles: ['CLIENT', 'ANALISTAOPE', 'ANALISTASAC', 'ADMIN'],
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
  imports: [MatIconModule, RouterLink, RouterOutlet],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly session = this.authSession.currentSession;
  protected readonly cards = computed<SettingsCardView[]>(() => {
    const role = this.session()?.user.role ?? null;
    return settingsCards.map((card) => ({ ...card, available: role ? card.roles.includes(role) : false }));
  });
  protected readonly showMain = signal(this.router.url === '/settings');

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.showMain.set(event.urlAfterRedirects === '/settings'));
  }
}
