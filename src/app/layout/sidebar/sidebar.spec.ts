import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthSession } from '../../core/models/auth-session.model';
import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, Sidebar],
      providers: [
        provideRouter([]),
        { provide: NOTIFICATION_DATA_SOURCE, useValue: { getUnreadCount: () => of(4) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('session', createSession());
    fixture.detectChanges();
  });

  it('should render the official identity only', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Conexion360');
    expect(content).toContain('Visibilidad total. Decisiones inteligentes.');
    expect(content).not.toContain('WebTracker');
    expect(content).not.toContain('Track360');
  });

  it('should render expected navigation labels without emoji icons', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Inicio');
    expect(content).toContain('Mis envíos');
    expect(content).toContain('Historial');
    expect(content).toContain('Notificaciones');
    expect(content).toContain('Reportes');
    expect(content).toContain('Ajustes');
    expect(content).not.toContain('ðŸ“¦');
  });

  it('should render unread notifications counter', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('4');
  });

  it('should emit logout from the embedded user menu', () => {
    const logoutSpy = jasmine.createSpy('logout');
    fixture.componentInstance.logout.subscribe(logoutSpy);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
    button?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });
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
