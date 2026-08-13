import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;
  let getUnreadCountSpy: jasmine.Spy<() => Observable<number>>;

  beforeEach(async () => {
    getUnreadCountSpy = jasmine.createSpy('getUnreadCount').and.returnValue(of(3));

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UserMenu],
      providers: [provideRouter([]), { provide: NOTIFICATION_DATA_SOURCE, useValue: { getUnreadCount: getUnreadCountSpy } }],
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
});

function openMenu(fixture: ComponentFixture<UserMenu>): void {
  const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.user-menu__trigger');
  trigger?.click();
  fixture.detectChanges();
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
    },
    accessToken: '',
    expiresAt: '2026-07-22T00:00:00.000Z',
  };
}
