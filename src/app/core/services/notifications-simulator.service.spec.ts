import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';
import { NotificationsSimulatorService } from './notifications-simulator.service';

describe('NotificationsSimulatorService', () => {
  let service: NotificationsSimulatorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationsSimulatorService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth0FacadeService,
          useValue: { user$: of({ auth0UserId: 'auth0|123', email: 'edison@example.com', document: '8110357412', roles: ['CLIENT'] }) },
        },
      ],
    });

    service = TestBed.inject(NotificationsSimulatorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should ask the backend to generate a notification for the current client', () => {
    let completed = false;

    service.generate().subscribe(() => (completed = true));

    const request = expectRequest();

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idClient')).toBe('8110357412');
    expect(request.request.params.get('Message')).toBeTruthy();

    request.flush({ dataResponse: 'result' });

    expect(completed).toBeTrue();
    // La notificación llega por el Hub: aquí no se consulta la bandeja.
    httpMock.expectNone((item) => item.url.includes('allnotifications'));
  });

  it('should never repeat the message two clicks in a row', () => {
    const messages: string[] = [];

    for (let click = 0; click < 3; click++) {
      service.generate().subscribe();
      const request = expectRequest();
      messages.push(request.request.params.get('Message') ?? '');
      request.flush({ dataResponse: 'result' });
    }

    expect(new Set(messages).size).toBe(3);
  });

  it('should surface a backend failure', () => {
    let failed = false;

    service.generate().subscribe({ error: () => (failed = true) });
    expectRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(failed).toBeTrue();
  });

  function expectRequest() {
    return httpMock.expectOne((item) => item.url === `${environment.api.baseUrl}/notifications/generatenotifications`);
  }
});
