import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Auth0Identity, UserProfile } from '../../../core/models/user-profile.model';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { MockUserProfileService } from '../../../mocks/services/mock-user-profile.service';
import { SettingsNotifications } from './settings-notifications';

describe('SettingsNotifications', () => {
  let fixture: ComponentFixture<SettingsNotifications>;
  let getProfileSpy: jasmine.Spy<(auth0UserId: string) => Observable<UserProfile | null>>;
  let saveProfileSpy: jasmine.Spy<(profile: UserProfile) => Observable<UserProfile>>;

  beforeEach(async () => {
    getProfileSpy = jasmine.createSpy('getProfileByAuth0Id').and.returnValue(of(createProfile()));
    saveProfileSpy = jasmine.createSpy('saveProfile').and.callFake((profile: UserProfile) => of(profile));

    await TestBed.configureTestingModule({
      imports: [SettingsNotifications, NoopAnimationsModule],
      providers: [provideRouter([]), 
        { provide: Auth0FacadeService, useValue: { user$: of(createIdentity()) } },
        { provide: MockUserProfileService, useValue: { getProfileByAuth0Id: getProfileSpy, saveProfile: saveProfileSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsNotifications);
  });

  it('should render notification preferences', fakeAsync(() => {
    render();

    expect(getText()).toContain('Correo');
    expect(getText()).toContain('Notificaciones en la app');
    expect(getText()).toContain('Contenedores');
  }));

  it('should save simulated preferences', fakeAsync(() => {
    render();

    const checkbox = fixture.nativeElement.querySelector('input[formcontrolname="email"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    clickButton('Guardar cambios');
    tick();
    fixture.detectChanges();

    expect(saveProfileSpy).toHaveBeenCalled();
    expect(getText()).toContain('Preferencias guardadas de forma simulada.');
  }));

  it('should render error state', fakeAsync(() => {
    getProfileSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getText()).toContain('No fue posible cargar las preferencias.');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((item) => item.textContent?.includes(label));
    if (!button) {
      throw new Error(`No se encontro el boton ${label}`);
    }
    button.click();
  }
});

function createIdentity(): Auth0Identity {
  return { auth0UserId: 'auth0|123', email: 'cliente@conexion360.com', name: 'Cliente Demo' };
}

function createProfile(): UserProfile {
  return {
    auth0UserId: 'auth0|123',
    fullName: 'Cliente Demo',
    company: 'Cliente demo',
    email: 'cliente@conexion360.com',
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
