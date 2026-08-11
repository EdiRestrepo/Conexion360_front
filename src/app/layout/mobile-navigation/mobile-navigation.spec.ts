import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { MobileNavigation } from './mobile-navigation';

describe('MobileNavigation', () => {
  let fixture: ComponentFixture<MobileNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MobileNavigation],
      providers: [provideRouter([]), { provide: NOTIFICATION_DATA_SOURCE, useValue: { getUnreadCount: () => of(0) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavigation);
  });

  it('should stay hidden when closed', () => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-nav')).toBeNull();
  });

  it('should render navigation options and dynamic user when opened', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('session', createSession());
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Inicio');
    expect(content).toContain('Mis envíos');
    expect(content).toContain('Reportes');
    expect(content).toContain('Cliente');
  });

  it('should emit close when a navigation link is clicked', () => {
    const closeSpy = jasmine.createSpy('close');
    fixture.componentRef.setInput('open', true);
    fixture.componentInstance.close.subscribe(closeSpy);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.mobile-nav__link');
    link?.click();

    expect(closeSpy).toHaveBeenCalled();
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
