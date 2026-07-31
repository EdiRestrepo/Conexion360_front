import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AuthSessionService } from '../../services/auth-session.service';
import { AuthRedirect } from './auth-redirect';

describe('AuthRedirect', () => {
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let fixture: ComponentFixture<AuthRedirect>;
  let loginSpy: jasmine.Spy<jasmine.Func>;
  let registerSpy: jasmine.Spy<jasmine.Func>;
  let navigateSpy: jasmine.Spy<jasmine.Func>;
  let routeData: { mode: 'login' | 'signup' };

  beforeEach(async () => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    loginSpy = jasmine.createSpy('login').and.returnValue(of(undefined));
    registerSpy = jasmine.createSpy('register').and.returnValue(of(undefined));
    routeData = { mode: 'login' };

    await TestBed.configureTestingModule({
      imports: [AuthRedirect],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get data() {
                return routeData;
              },
            },
          },
        },
        {
          provide: AuthSessionService,
          useValue: {
            isAuthenticated$: isAuthenticatedSubject.asObservable(),
            isLoading$: of(false),
            login: loginSpy,
            register: registerSpy,
          },
        },
      ],
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('should redirect login route to Auth0 Universal Login', () => {
    fixture = TestBed.createComponent(AuthRedirect);
    fixture.detectChanges();

    expect(loginSpy).toHaveBeenCalledWith('/dashboard');
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('should redirect register route to Auth0 Universal Signup', () => {
    routeData = { mode: 'signup' };

    fixture = TestBed.createComponent(AuthRedirect);
    fixture.detectChanges();

    expect(registerSpy).toHaveBeenCalled();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('should navigate authenticated users to dashboard', () => {
    isAuthenticatedSubject.next(true);

    fixture = TestBed.createComponent(AuthRedirect);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(loginSpy).not.toHaveBeenCalled();
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('should stay silent when Auth0 redirection fails', () => {
    loginSpy.and.returnValue(throwError(() => new Error('Auth0 unavailable')));

    fixture = TestBed.createComponent(AuthRedirect);
    fixture.detectChanges();

    expect(loginSpy).toHaveBeenCalledWith('/dashboard');
  });
});