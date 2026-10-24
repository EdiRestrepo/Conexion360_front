import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

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

  it('should retry listusers when Auth0 reports its rate limit', fakeAsync(() => {
    const url = `${baseUrl}/listusers?page=1&size=10`;
    const rateLimited = { error: 'Global limit has been reached', message: 'Solicitud procesada' };
    let total = -1;

    service.list(1, 10).subscribe((page) => (total = page.totalItems));

    httpMock.expectOne(url).flush(rateLimited, { status: 500, statusText: 'Internal Server Error' });
    tick(1500);
    httpMock.expectOne(url).flush({ dataResponse: [[]], meta: { totalItems: 0 } });

    expect(total).toBe(0);
  }));

  it('should not retry listusers on other errors', () => {
    let failed = false;

    service.list(1, 10).subscribe({ error: () => (failed = true) });
    httpMock
      .expectOne(`${baseUrl}/listusers?page=1&size=10`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Internal Server Error' });

    expect(failed).toBeTrue();
  });
});
