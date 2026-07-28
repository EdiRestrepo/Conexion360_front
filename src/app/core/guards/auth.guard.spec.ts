import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { authGuard } from './auth.guard';
import { Auth0Identity, UserProfile } from '../models/user-profile.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';
import { MockUserProfileService } from '../../mocks/services/mock-user-profile.service';

describe('authGuard', () => {
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<Auth0Identity | null>;
  let completeProfileSpy: jasmine.Spy<(identity: Auth0Identity) => Observable<UserProfile | null>>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    userSubject = new BehaviorSubject<Auth0Identity | null>(null);
    completeProfileSpy = jasmine.createSpy<(identity: Auth0Identity) => Observable<UserProfile | null>>().and.returnValue(
      of(null),
    );

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
        {
          provide: MockUserProfileService,
          useValue: {
            completeProfileFromIdentity: completeProfileSpy,
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

  it('should allow authenticated users with a completed profile', (done) => {
    const identity = createIdentity();
    userSubject.next(identity);
    isAuthenticatedSubject.next(true);
    completeProfileSpy.and.returnValue(of(createProfile(identity)));

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should redirect authenticated users without profile to complete profile', (done) => {
    userSubject.next(createIdentity());
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;
    const router = TestBed.inject(Router);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/complete-profile']));
      done();
    });
  });

  it('should allow authenticated users to complete an incomplete profile', (done) => {
    userSubject.next(createIdentity());
    isAuthenticatedSubject.next(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/complete-profile' } as RouterStateSnapshot),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });
});

function createIdentity(): Auth0Identity {
  return {
    auth0UserId: 'auth0|123',
    email: 'cliente@demo.com',
    name: 'Cliente Demo',
  };
}

function createProfile(identity: Auth0Identity): UserProfile {
  return {
    auth0UserId: identity.auth0UserId,
    fullName: 'Cliente Demo',
    company: 'Empresa Demo',
    email: identity.email,
    phone: null,
    role: 'CLIENT',
    profileCompleted: true,
    notificationPreferences: {
      email: true,
      inApp: true,
      shipmentStatusChanges: true,
      delays: true,
      delivery: true,
      documents: true,
      containers: true,
    },
    acceptedDataPolicyAt: '2026-07-22T00:00:00.000Z',
    createdAt: '2026-07-22T00:00:00.000Z',
  };
}
