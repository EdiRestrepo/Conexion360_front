import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { Auth0Identity, UserRole } from '../models/user.model';
import { Auth0FacadeService } from '../services/auth0-facade.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<Auth0Identity | null>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
    userSubject = new BehaviorSubject<Auth0Identity | null>(createIdentity(['ADMIN']));

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

  it('should allow users with an allowed Auth0 role', (done) => {
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should redirect users without an Auth0 role to settings', (done) => {
    userSubject.next(createIdentity([]));
    const router = TestBed.inject(Router);
    const result = runGuard(['ADMIN']);

    result.subscribe((canActivate) => {
      expect(canActivate).toEqual(router.createUrlTree(['/settings']));
      done();
    });
  });

  it('should redirect users without required role to settings', (done) => {
    userSubject.next(createIdentity(['CLIENT']));
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
