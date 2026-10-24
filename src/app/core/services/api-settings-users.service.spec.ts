import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { SettingsRole, SettingsUserUpdate } from '../models/settings-user.model';
import { ApiSettingsUsersService } from './api-settings-users.service';

describe('ApiSettingsUsersService', () => {
  const baseUrl = `${environment.api.baseUrl}/settings`;
  let service: ApiSettingsUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiSettingsUsersService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiSettingsUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should patch updateuser with the encoded Auth0 userId in the path', () => {
    const changes = { userId: 'auth0|1', email: 'a@tcc.com' } as SettingsUserUpdate;

    service.update('auth0|1', changes).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/updateuser/auth0%7C1`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBe(changes);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should patch updateuserstatus with isActive in the body', () => {
    service.setStatus('auth0|1', false).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/updateuserstatus/auth0%7C1`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isActive: false });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should list the Auth0 roles', () => {
    let roles: SettingsRole[] = [];

    service.listRoles().subscribe((value) => (roles = value));

    const request = httpMock.expectOne(`${baseUrl}/listroles`);

    expect(request.request.method).toBe('GET');
    request.flush([{ id: 'rol_1', name: 'ADMIN', description: 'Administrador' }]);

    expect(roles).toEqual([{ id: 'rol_1', name: 'ADMIN', description: 'Administrador' }]);
  });
});
