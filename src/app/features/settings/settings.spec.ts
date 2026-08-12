import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { AuthSession } from '../../core/models/auth-session.model';
import { UserRole } from '../../core/models/user.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Settings } from './settings';

@Component({ selector: 'app-empty', template: '' })
class EmptyComponent {}

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let sessionSignal: ReturnType<typeof signal<AuthSession | null>>;

  beforeEach(async () => {
    sessionSignal = signal(createSession('CLIENT'));

    await TestBed.configureTestingModule({
      imports: [Settings, NoopAnimationsModule],
      providers: [
        provideRouter([
          { path: 'settings', component: EmptyComponent },
          { path: 'settings/notifications', component: EmptyComponent },
        ]),
        { provide: AuthSessionService, useValue: { currentSession: sessionSignal } },
      ],
    }).compileComponents();

    await TestBed.inject(Router).navigateByUrl('/settings');
    fixture = TestBed.createComponent(Settings);
  });

  it('should render settings cards and mark admin cards as locked for CLIENT role', () => {
    fixture.detectChanges();

    expect(getText()).toContain('Ajuste de notificaciones');
    expect(getText()).toContain('Gestión de usuarios');
    expect(getText()).toContain('Ajustes maestros');
    expect(getText()).toContain('Solo administradores');
  });

  it('should render administrative cards as links for ADMIN role', () => {
    sessionSignal.set(createSession('ADMIN'));
    fixture.detectChanges();

    expect(getText()).toContain('Gestión de usuarios');
    expect(getText()).toContain('Ajustes maestros');
    expect(getText()).not.toContain('Solo administradores');
  });

  it('should hide the main header and cards when navigating to a child route', async () => {
    fixture.detectChanges();
    expect(getText()).toContain('Ajustes');
    expect(getText()).toContain('Ajuste de notificaciones');

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/settings/notifications');
    fixture.detectChanges();

    expect(getText()).not.toContain('Administra la configuración de la plataforma.');
    expect((fixture.nativeElement as HTMLElement).querySelector('.settings-cards')).toBeNull();
  });

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

function createSession(role: UserRole): AuthSession {
  return {
    user: {
      id: 'auth0|123',
      name: 'Usuario Demo',
      email: 'usuario@conexion360.com',
      role,
    },
    accessToken: '',
    expiresAt: '2026-07-28T00:00:00.000Z',
  };
}