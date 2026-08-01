import { fakeAsync, tick } from '@angular/core/testing';

import { Auth0Identity } from '../../core/models/user-profile.model';
import { MockUserProfileService } from './mock-user-profile.service';

describe('MockUserProfileService', () => {
  let service: MockUserProfileService;

  beforeEach(() => {
    localStorage.clear();
    service = new MockUserProfileService();
  });

  it('should preserve pending registration without credentials', fakeAsync(() => {
    service
      .savePendingRegistration({
        fullName: 'Nuevo Cliente',
        company: 'Empresa Demo',
        email: 'nuevo@demo.com',
        phone: null,
        acceptedDataPolicy: true,
        createdAt: '2026-07-22T00:00:00.000Z',
      })
      .subscribe();
    tick(250);

    service.getPendingRegistration().subscribe((profile) => {
      expect(profile?.fullName).toBe('Nuevo Cliente');
      expect(service.hasUnsafeStoredCredentials()).toBeFalse();
    });
    tick(250);
  }));

  it('should create profile after callback with CLIENT role by default', fakeAsync(() => {
    const identity = createIdentity();

    service
      .savePendingRegistration({
        fullName: 'Nuevo Cliente',
        company: 'Empresa Demo',
        email: identity.email,
        phone: '3001234567',
        acceptedDataPolicy: true,
        createdAt: '2026-07-22T00:00:00.000Z',
      })
      .subscribe();
    tick(250);

    service.completeProfileFromIdentity(identity).subscribe((profile) => {
      expect(profile?.auth0UserId).toBe(identity.auth0UserId);
      expect(profile?.role).toBe('CLIENT');
      expect(profile?.profileCompleted).toBeTrue();
    });
    tick(250);
  }));

  it('should return null when profile is incomplete and no pending data exists', fakeAsync(() => {
    service.completeProfileFromIdentity(createIdentity()).subscribe((profile) => {
      expect(profile).toBeNull();
    });
    tick(250);
  }));
});

function createIdentity(): Auth0Identity {
  return {
    auth0UserId: 'auth0|123',
    email: 'nuevo@demo.com',
    name: 'Nuevo Cliente',
    roles: ['CLIENT'],
  };
}

