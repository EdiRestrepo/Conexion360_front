import { Component } from '@angular/core';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { ApiSettingsUsersService } from '../../core/services/api-settings-users.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { IdlePhase, IdleSessionService } from '../../core/services/idle-session.service';
import { MainLayout } from './main-layout';

/**
 * El servicio real registra listeners sobre `document` y un intervalo de un
 * segundo que sobrevivirían a toda la suite de Karma. Se sustituye por un
 * doble con la fase bajo control del test.
 */
type IdleSessionStub = Pick<IdleSessionService, 'phase$' | 'remainingSeconds' | 'start' | 'keepAlive' | 'stop'>;

@Component({
  template: '',
})
class TestPage {}

describe('MainLayout', () => {
  let fixture: ComponentFixture<MainLayout>;
  let logoutSpy: jasmine.Spy;
  let idlePhase$: Subject<IdlePhase>;
  let keepAliveSpy: jasmine.Spy;
  let idleStopSpy: jasmine.Spy;

  beforeEach(async () => {
    logoutSpy = jasmine.createSpy('logout').and.returnValue(of(undefined));
    idlePhase$ = new Subject<IdlePhase>();
    keepAliveSpy = jasmine.createSpy('keepAlive');
    idleStopSpy = jasmine.createSpy('stop');

    const idleSession: IdleSessionStub = {
      phase$: idlePhase$.asObservable(),
      remainingSeconds: signal(60),
      start: jasmine.createSpy('start'),
      keepAlive: keepAliveSpy,
      stop: idleStopSpy,
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MainLayout],
      providers: [
        provideRouter([{ path: 'dashboard', component: TestPage }]),
        {
          provide: AuthSessionService,
          useValue: {
            authError$: of(null),
            currentSession: signal(createSession()),
            isLoading$: of(false),
            logout: logoutSpy,
          },
        },
        { provide: NOTIFICATION_DATA_SOURCE, useValue: { getUnreadCount: () => of(0) } },
        {
          provide: ApiSettingsUsersService,
          useValue: jasmine.createSpyObj<ApiSettingsUsersService>('ApiSettingsUsersService', [
            'list',
            'getById',
            'update',
            'delete',
          ]),
        },
        { provide: IdleSessionService, useValue: idleSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('should open mobile navigation from the header button', () => {
    const menuButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.header__menu-button');
    menuButton?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-nav')).not.toBeNull();
  });

  it('should close mobile navigation when route changes', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const menuButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.header__menu-button');
    menuButton?.click();
    fixture.detectChanges();

    router.navigateByUrl('/dashboard');
    tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-nav')).toBeNull();
  }));

  it('should delegate logout to the session service', () => {
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.user-menu__trigger');
    trigger?.click();
    fixture.detectChanges();

    const menuItem = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')).find((item) =>
      item.textContent?.includes('Cerrar sesión'),
    );
    menuItem?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should warn before closing the session for inactivity', () => {
    idlePhase$.next('warning');
    fixture.detectChanges();

    expect(document.querySelectorAll('app-session-timeout-dialog')).toHaveSize(1);
    expect(document.body.textContent).toContain('Tu sesión está por expirar');
  });

  it('should not stack a second warning dialog', () => {
    idlePhase$.next('warning');
    fixture.detectChanges();
    idlePhase$.next('warning');
    fixture.detectChanges();

    expect(document.querySelectorAll('app-session-timeout-dialog')).toHaveSize(1);
  });

  it('should close the warning and log out when the session expires', () => {
    idlePhase$.next('warning');
    fixture.detectChanges();

    idlePhase$.next('expired');
    fixture.detectChanges();

    expect(logoutSpy).toHaveBeenCalled();
    expect(idleStopSpy).toHaveBeenCalled();
  });

  // El cierre del diálogo de Material no es síncrono ni con animaciones
  // desactivadas: hace falta vaciar la cola antes de comprobar el DOM.
  it('should close the warning when activity resumes in another tab', fakeAsync(() => {
    idlePhase$.next('warning');
    fixture.detectChanges();

    idlePhase$.next('active');
    fixture.detectChanges();
    flush();

    expect(document.querySelectorAll('app-session-timeout-dialog')).toHaveSize(0);
    expect(logoutSpy).not.toHaveBeenCalled();
  }));

  it('should keep the session alive when the user chooses to stay', fakeAsync(() => {
    idlePhase$.next('warning');
    fixture.detectChanges();

    const stayButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-dialog-actions button')).find(
      (button) => button.textContent?.includes('Seguir conectado'),
    );
    stayButton?.click();
    fixture.detectChanges();
    flush();

    expect(keepAliveSpy).toHaveBeenCalled();
    expect(logoutSpy).not.toHaveBeenCalled();
  }));
});

function createSession(): AuthSession {
  return {
    user: {
      id: 'auth0|123',
      name: 'Cliente Demo',
      email: 'cliente@conexion360.com',
      role: 'CLIENT',
    },
    accessToken: '',
    expiresAt: '2026-07-22T00:00:00.000Z',
  };
}
