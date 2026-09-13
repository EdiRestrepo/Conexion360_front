import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { ApiSettingsUsersService } from '../../core/services/api-settings-users.service';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;
  let getUnreadCountSpy: jasmine.Spy<() => Observable<number>>;
  let usersService: jasmine.SpyObj<ApiSettingsUsersService>;

  beforeEach(async () => {
    getUnreadCountSpy = jasmine.createSpy('getUnreadCount').and.returnValue(of(3));
    usersService = jasmine.createSpyObj<ApiSettingsUsersService>('ApiSettingsUsersService', [
      'list',
      'getById',
      'update',
      'delete',
    ]);

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UserMenu],
      providers: [
        provideRouter([]),
        { provide: NOTIFICATION_DATA_SOURCE, useValue: { getUnreadCount: getUnreadCountSpy } },
        { provide: ApiSettingsUsersService, useValue: usersService },
      ],
    }).compileComponents();
  });

  it('should render dynamic profile data and translated role in the dropdown', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('ANALISTAOPE'));
    fixture.detectChanges();

    openMenu(fixture);

    const content = document.body.textContent ?? '';

    expect(content).toContain('Iván Valencia');
    expect(content).toContain('ivan.valencia@conexion360.com');
    expect(content).toContain('Analista operativo');
  });

  it('should use initials when the Auth0 picture is not available', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT', null));
    fixture.detectChanges();

    const avatar = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__avatar');

    expect(avatar?.textContent?.trim()).toBe('IV');
  });

  it('should render the Auth0 picture when available', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('ADMIN', 'https://example.com/avatar.png'));
    fixture.detectChanges();

    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('img.user-menu__avatar');

    expect(image?.src).toContain('https://example.com/avatar.png');
  });

  it('should never render a standalone logout button', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.user-menu__logout')).toBeNull();

    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.user-menu__logout')).toBeNull();
  });

  it('should emit logout from the menu item when compact', () => {
    fixture = TestBed.createComponent(UserMenu);
    const logoutSpy = jasmine.createSpy('logout');
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentRef.setInput('compact', true);
    fixture.componentInstance.logout.subscribe(logoutSpy);
    fixture.detectChanges();

    openMenu(fixture);

    const menuItem = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')).find((item) =>
      item.textContent?.includes('Cerrar sesión'),
    );
    menuItem?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should fall back to initials when the picture fails to load', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT', 'https://example.com/rota.png'));
    fixture.detectChanges();

    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('img.user-menu__avatar');
    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('img.user-menu__avatar')).toBeNull();
    expect(host.querySelector('span.user-menu__avatar')?.textContent?.trim()).toBe('IV');
  });

  it('should render name and role beside the avatar only when identity is requested', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('ANALISTAOPE'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.user-menu__identity')).toBeNull();

    fixture.componentRef.setInput('showIdentity', true);
    fixture.detectChanges();

    const identity = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__identity');

    expect(identity?.textContent).toContain('Iván Valencia');
    expect(identity?.textContent).toContain('Analista operativo');
  });

  it('should emit logout from the menu item when not compact', () => {
    fixture = TestBed.createComponent(UserMenu);
    const logoutSpy = jasmine.createSpy('logout');
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentInstance.logout.subscribe(logoutSpy);
    fixture.detectChanges();

    openMenu(fixture);

    const menuItem = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')).find((item) =>
      item.textContent?.includes('Cerrar sesión'),
    );
    menuItem?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should not render the notifications bell when not compact', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.user-menu__bell')).toBeNull();
  });

  it('should render the notifications bell with the unread badge when compact', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const bell = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__bell');
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__badge');

    expect(bell).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('3');
  });

  it('should hide the badge when there are no unread notifications', () => {
    getUnreadCountSpy.and.returnValue(of(0));
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const bell = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__bell');
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__badge');

    expect(bell).not.toBeNull();
    expect(badge).toBeNull();
  });

  it('should link the bell to /notifications', () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const bell = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.user-menu__bell');

    expect(bell?.getAttribute('href')).toContain('/notifications');
  });

  it('opens the shared detail dialog from the session, without the admin endpoint', async () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.detectChanges();

    openMenu(fixture);
    clickMenuItem('Actualizar datos personales');

    // `/settings/getuser` es admin-only: si se volviera a llamar, la opción
    // dejaría de servir para CLIENT, ANALISTAOPE y ANALISTASAC.
    expect(usersService.getById).not.toHaveBeenCalled();

    // El diálogo se importa de forma dinámica (chunk lazy real, servido por
    // Karma): se espera con temporizador real en vez de `whenStable()`, que no
    // siempre detecta la carga del chunk.
    await waitFor(() => !!document.querySelector('.mat-mdc-dialog-title'));
    fixture.detectChanges();

    const dialogTitle = document.querySelector('.mat-mdc-dialog-title')?.textContent ?? '';
    expect(dialogTitle).toContain('Iván Valencia');
  });

  it('prefills phone and email from the session', async () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('ANALISTASAC'));
    fixture.detectChanges();

    openMenu(fixture);
    clickMenuItem('Actualizar datos personales');
    await waitFor(() => !!document.querySelector('.mat-mdc-dialog-title'));
    fixture.detectChanges();

    const phone = document.querySelector<HTMLInputElement>('input[type="tel"]');
    const email = document.querySelector<HTMLInputElement>('input[type="email"]');

    expect(phone?.value).toBe('+573001112233');
    expect(email?.value).toBe('ivan.valencia@conexion360.com');
  });

  it('opens a single dialog when the option is clicked twice', async () => {
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.detectChanges();

    openMenu(fixture);
    clickMenuItem('Actualizar datos personales');
    openMenu(fixture);
    clickMenuItem('Actualizar datos personales');

    await waitFor(() => !!document.querySelector('.mat-mdc-dialog-title'));
    fixture.detectChanges();

    expect(document.querySelectorAll('.mat-mdc-dialog-container').length).toBe(1);
  });

  it('explains a 403 on save instead of dumping the raw error', async () => {
    usersService.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.detectChanges();

    openMenu(fixture);
    clickMenuItem('Actualizar datos personales');
    await waitFor(() => !!document.querySelector('.mat-mdc-dialog-title'));
    fixture.detectChanges();

    const save = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-dialog-actions button')).find(
      (button) => button.textContent?.includes('Guardar cambios'),
    );
    save?.click();
    await waitFor(() => !!document.querySelector('.mat-mdc-snack-bar-label'));

    const snackMessage = document.querySelector('.mat-mdc-snack-bar-label')?.textContent ?? '';

    expect(snackMessage).toContain('todavía no tiene permiso');
    expect((fixture.nativeElement as HTMLElement).querySelector('.user-menu__loader')).toBeNull();
  });
});

function openMenu(fixture: ComponentFixture<UserMenu>): void {
  const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.user-menu__trigger');
  trigger?.click();
  fixture.detectChanges();
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** El menú de Material se renderiza en el overlay, fuera del fixture. */
function clickMenuItem(label: string): void {
  const item = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')).find((button) =>
    button.textContent?.includes(label),
  );
  item?.click();
}

function createSession(role: AuthSession['user']['role'], picture: string | null = null): AuthSession {
  return {
    user: {
      id: 'auth0|123',
      name: 'Iván Valencia',
      email: 'ivan.valencia@conexion360.com',
      role,
      company: 'Conexion360',
      picture,
      phoneNumber: '+573001112233',
      nickname: 'ivanvalencia',
    },
    accessToken: '',
    expiresAt: '2026-07-22T00:00:00.000Z',
  };
}
