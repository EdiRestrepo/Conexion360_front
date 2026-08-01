import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { MockUserProfileService } from '../../mocks/services/mock-user-profile.service';
import { Auth0Identity, UserProfile } from '../models/user-profile.model';
import { UserRole } from '../models/user.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<Auth0Identity | null>;
  let completeProfileSpy: jasmine.Spy<(identity: Auth0Identity) => Observable<UserProfile | null>>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
    userSubject = new BehaviorSubject<Auth0Identity | null>(createIdentity(['ADMIN']));
    completeProfileSpy = jasmine
      .createSpy<(identity: Auth0Identity) => Observable<UserProfile | null>>()
      .and.returnValue(of(null));

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
        { provide: MockUserProfileService, useValue: { completeProfileFromIdentity: completeProfileSpy } },
      ],
    });
  });

  it('should allow users with an allowed Auth0 role', (done) => {
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      expect(completeProfileSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('should allow users with an allowed mock profile role as fallback', (done) => {
    userSubject.next(createIdentity([]));
    completeProfileSpy.and.returnValue(of(createProfile('ADMIN')));
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should redirect users without required role to settings', (done) => {
    userSubject.next(createIdentity(['CLIENT']));
    completeProfileSpy.and.returnValue(of(createProfile('CLIENT')));
    const router = TestBed.inject(Router);
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/settings']));
      done();
    });
  });

  it('should redirect anonymous users to login', (done) => {
    isAuthenticatedSubject.next(false);
    const router = TestBed.inject(Router);
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/login']));
      done();
    });
  });

  function runGuard(roles: UserRole[]): Observable<boolean | ReturnType<Router['createUrlTree']>> {
    return TestBed.runInInjectionContext(() =>
      roleGuard(({ data: { roles } } as unknown) as ActivatedRouteSnapshot, {} as never),
    ) as Observable<boolean | ReturnType<Router['createUrlTree']>>;
  }
});

function createIdentity(roles: UserRole[]): Auth0Identity {
  return { auth0UserId: 'auth0|123', email: 'admin@conexion360.com', name: 'Admin Conexion360', roles };
}

function createProfile(role: UserRole): UserProfile {
  return {
    auth0UserId: 'auth0|123',
    fullName: 'Admin Conexion360',
    company: 'Conexion360',
    email: 'admin@conexion360.com',
    phone: null,
    role,
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
