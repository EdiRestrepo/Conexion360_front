import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { AuthSession } from '../../core/models/auth-session.model';
import { UserRole } from '../../core/models/user.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Settings } from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let sessionSignal: ReturnType<typeof signal<AuthSession | null>>;

  beforeEach(async () => {
    sessionSignal = signal(createSession('CLIENT'));

    await TestBed.configureTestingModule({
      imports: [Settings, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: AuthSessionService, useValue: { currentSession: sessionSignal } }],
    }).compileComponents();

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
    expect(getText()).toContain('Rol: Administrador');
    expect(getText()).not.toContain('Solo administradores');
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