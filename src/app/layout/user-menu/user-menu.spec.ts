import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AuthSession } from '../../core/models/auth-session.model';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UserMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(UserMenu);
  });

  it('should render dynamic profile data and translated role', () => {
    fixture.componentRef.setInput('session', createSession('ANALISTAOPE'));
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Iván Valencia');
    expect(content).toContain('ivan.valencia@conexion360.com');
    expect(content).toContain('Analista operativo');
  });

  it('should use initials when the Auth0 picture is not available', () => {
    fixture.componentRef.setInput('session', createSession('CLIENT', null));
    fixture.detectChanges();

    const avatar = (fixture.nativeElement as HTMLElement).querySelector('.user-menu__avatar');

    expect(avatar?.textContent?.trim()).toBe('IV');
  });

  it('should render the Auth0 picture when available', () => {
    fixture.componentRef.setInput('session', createSession('ADMIN', 'https://example.com/avatar.png'));
    fixture.detectChanges();

    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('img.user-menu__avatar');

    expect(image?.src).toContain('https://example.com/avatar.png');
  });

  it('should emit logout when the logout button is clicked', () => {
    const logoutSpy = jasmine.createSpy('logout');
    fixture.componentRef.setInput('session', createSession('CLIENT'));
    fixture.componentInstance.logout.subscribe(logoutSpy);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
    button?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });
});

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
