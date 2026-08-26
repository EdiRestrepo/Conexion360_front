import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { authGuard } from './auth.guard';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';
import {
  BROWSER_SESSION_CHANNEL_NAME,
  clearBrowserSession,
  isBrowserSessionActive,
  markBrowserSessionActive,
} from '../utils/browser-session';

describe('authGuard', () => {
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<Auth0Identity | null>;

  afterEach(() => {
    clearBrowserSession();
  });

  beforeEach(() => {
    clearBrowserSession();
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    userSubject = new BehaviorSubject<Auth0Identity | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth0FacadeService,
          useValue: {
            isAuthenticated$: isAuthenticatedSubject.asObservable(),
            isLoading$: of(false),
            user$: userSubject.asObservable(),
          },
        },
      ],
    });
  });

  it('should redirect anonymous users to the local login page', (done) => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;
    const router = TestBed.inject(Router);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/login']));
      done();
    });
  });

  it('should allow authenticated users with an Auth0 identity and an active browser session', (done) => {
    markBrowserSessionActive();
    userSubject.next(createIdentity());
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should redirect authenticated users without an identity to login', (done) => {
    markBrowserSessionActive();
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;
    const router = TestBed.inject(Router);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/login']));
      done();
    });
  });

  it('should redirect to login when the Auth0 cache survives but no tab has an active browser session', (done) => {
    userSubject.next(createIdentity());
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;
    const router = TestBed.inject(Router);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/login']));
      done();
    });
  });

  it('should allow authenticated users when a sibling tab reports an active session', (done) => {
    const sibling = new BroadcastChannel(BROWSER_SESSION_CHANNEL_NAME);
    sibling.onmessage = (event: MessageEvent<{ type: string }>) => {
      if (event.data.type === 'ping') {
        sibling.postMessage({ type: 'pong' });
      }
    };

    userSubject.next(createIdentity());
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      expect(isBrowserSessionActive()).toBeTrue();
      sibling.close();
      done();
    });
  });
});

function createIdentity(): Auth0Identity {
  return {
    auth0UserId: 'auth0|123',
    email: 'cliente@demo.com',
    name: 'Cliente Demo',
    roles: ['CLIENT'],
  };
}
