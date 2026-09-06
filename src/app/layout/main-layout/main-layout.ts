import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { IdlePhase, IdleSessionService } from '../../core/services/idle-session.service';
import { Header } from '../header/header';
import { layoutNavItems } from '../layout-navigation';
import { MobileNavigation } from '../mobile-navigation/mobile-navigation';
import {
  SessionTimeoutChoice,
  SessionTimeoutDialog,
  SessionTimeoutDialogData,
} from '../session-timeout-dialog/session-timeout-dialog';
import { Sidebar } from '../sidebar/sidebar';

type NavigationOrigin = 'dashboard' | 'history' | 'shipments';

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
  private readonly idleSession = inject(IdleSessionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  /** Guarda contra abrir un segundo aviso encima del que ya está en pantalla. */
  private timeoutDialogRef: MatDialogRef<SessionTimeoutDialog, SessionTimeoutChoice> | null = null;

  protected readonly session = this.authSession.currentSession;
  protected readonly isLoading$ = this.authSession.isLoading$;
  protected readonly authError$ = this.authSession.authError$;
  protected readonly mobileNavigationOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly detailOrigin = signal<NavigationOrigin | null>(null);
  protected readonly bottomNavItems = layoutNavItems
    .filter((item) => item.route !== '/settings')
    .map((item) => ({
      ...item,
      label: item.route === '/shipments' ? 'Env\u00edos' : item.route === '/notifications' ? 'Alertas' : item.label,
    }));

  constructor() {
    this.updateDetailOrigin();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.closeMobileNavigation();
        this.updateDetailOrigin();
      });

    // El control de inactividad vive aquí porque `MainLayout` es el único
    // componente bajo `authGuard`: envuelve todas las rutas privadas y muere al
    // salir a `/login`.
    this.idleSession.start();
    this.destroyRef.onDestroy(() => this.idleSession.stop());
    this.idleSession.phase$.pipe(takeUntilDestroyed()).subscribe((phase) => this.onIdlePhase(phase));
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
    this.idleSession.stop();
    this.timeoutDialogRef?.close();
    this.authSession.logout().pipe(take(1)).subscribe();
  }

  private onIdlePhase(phase: IdlePhase): void {
    if (phase === 'warning') {
      this.openTimeoutDialog();
      return;
    }

    this.timeoutDialogRef?.close();

    if (phase === 'expired') {
      this.logout();
    }
  }

  private openTimeoutDialog(): void {
    if (this.timeoutDialogRef) {
      return;
    }

    this.timeoutDialogRef = this.dialog.open<SessionTimeoutDialog, SessionTimeoutDialogData, SessionTimeoutChoice>(
      SessionTimeoutDialog,
      {
        data: { remainingSeconds: this.idleSession.remainingSeconds },
        role: 'alertdialog',
        disableClose: true,
        width: '420px',
        maxWidth: '92vw',
      },
    );

    this.timeoutDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((choice) => {
        // Se limpia antes de reaccionar: si el cierre vino del propio diálogo,
        // el `logout()` de abajo ya no encuentra una referencia que cerrar.
        this.timeoutDialogRef = null;

        if (choice === 'stay') {
          this.idleSession.keepAlive();
        } else if (choice === 'logout') {
          this.logout();
        }
      });
  }

  private updateDetailOrigin(): void {
    const tree = this.router.parseUrl(this.router.url);
    const primarySegments = tree.root.children['primary']?.segments ?? [];
    const isShipmentDetail = primarySegments.length === 2 && primarySegments[0].path === 'shipments';
    const from = tree.queryParams['from'];

    this.detailOrigin.set(isShipmentDetail && this.isNavigationOrigin(from) ? from : null);
  }

  private isNavigationOrigin(value: unknown): value is NavigationOrigin {
    return value === 'dashboard' || value === 'history' || value === 'shipments';
  }
}
