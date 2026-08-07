import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { Header } from '../header/header';
import { layoutNavItems } from '../layout-navigation';
import { MobileNavigation } from '../mobile-navigation/mobile-navigation';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  imports: [AsyncPipe, Header, MatIconModule, MobileNavigation, RouterLink, RouterLinkActive, RouterOutlet, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly session = this.authSession.currentSession;
  protected readonly isLoading$ = this.authSession.isLoading$;
  protected readonly authError$ = this.authSession.authError$;
  protected readonly mobileNavigationOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly bottomNavItems = layoutNavItems
    .filter((item) => item.route !== '/settings')
    .map((item) => ({
      ...item,
      label: item.route === '/shipments' ? 'Env\u00edos' : item.route === '/notifications' ? 'Alertas' : item.label,
    }));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMobileNavigation());
  }

  protected openMobileNavigation(): void {
    this.mobileNavigationOpen.set(true);
  }

  protected closeMobileNavigation(): void {
    this.mobileNavigationOpen.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected logout(): void {
    this.authSession.logout().pipe(take(1)).subscribe();
  }
}
