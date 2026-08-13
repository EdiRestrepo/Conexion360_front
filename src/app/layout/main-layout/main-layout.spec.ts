import { Component } from '@angular/core';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NOTIFICATION_DATA_SOURCE } from '../../core/contracts/notification-data-source';
import { AuthSession } from '../../core/models/auth-session.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { MainLayout } from './main-layout';

@Component({
  template: '',
})
class TestPage {}

describe('MainLayout', () => {
  let fixture: ComponentFixture<MainLayout>;
  let logoutSpy: jasmine.Spy;

  beforeEach(async () => {
    logoutSpy = jasmine.createSpy('logout').and.returnValue(of(undefined));

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
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
