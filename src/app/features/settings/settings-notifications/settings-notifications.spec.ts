import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { UserNotificationPreferences, defaultNotificationPreferences } from '../../../core/models/notification.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { Auth0Identity } from '../../../core/models/user.model';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { NotificationPreferencesService } from '../../../core/services/notification-preferences.service';
import { SettingsNotifications } from './settings-notifications';

describe('SettingsNotifications', () => {
  let fixture: ComponentFixture<SettingsNotifications>;
  let getPreferencesSpy: jasmine.Spy<(auth0UserId: string) => Observable<UserNotificationPreferences | null>>;
  let savePreferencesSpy: jasmine.Spy<(auth0UserId: string, preferences: UserNotificationPreferences) => Observable<UserNotificationPreferences>>;
  let getNotificationSettingsSpy: jasmine.Spy<() => Observable<UserNotificationPreferences>>;

  beforeEach(async () => {
    getPreferencesSpy = jasmine.createSpy('getPreferences').and.returnValue(of(createPreferences()));
    savePreferencesSpy = jasmine
      .createSpy('savePreferences')
      .and.callFake((auth0UserId: string, preferences: UserNotificationPreferences) => of(preferences));
    getNotificationSettingsSpy = jasmine
      .createSpy('getNotificationSettings')
      .and.returnValue(of(defaultNotificationPreferences));

    await TestBed.configureTestingModule({
      imports: [SettingsNotifications, NoopAnimationsModule],
      providers: [provideRouter([]), 
        { provide: Auth0FacadeService, useValue: { user$: of(createIdentity()) } },
        { provide: NotificationPreferencesService, useValue: { getPreferences: getPreferencesSpy, savePreferences: savePreferencesSpy } },
        { provide: ApiSettingsService, useValue: { getNotificationSettings: getNotificationSettingsSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsNotifications);
  });

  it('should render notification preferences', fakeAsync(() => {
    render();

    expect(getText()).toContain('Correo');
    expect(getText()).toContain('Notificaciones en la app');
    expect(getText()).toContain('SMS / Mensajes');
    expect(getText()).toContain('Envío en camino');
    expect(getText()).toContain('Recordatorios de entrega');
  }));

  it('should save preferences', fakeAsync(() => {
    render();

    const checkbox = fixture.nativeElement.querySelector('input[formcontrolname="email"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    clickButton('Guardar cambios');
    tick();
    fixture.detectChanges();

    expect(savePreferencesSpy).toHaveBeenCalled();
    expect(getText()).toContain('Preferencias guardadas.');
  }));

  it('should apply the settings returned by the backend', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(of({ ...createPreferences(), sms: true, delays: false }));
    getPreferencesSpy.and.returnValue(of(null));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getCheckbox('sms').checked).toBeTrue();
    expect(getCheckbox('delays').checked).toBeFalse();
  }));

  it('should let what the user saved locally win over the backend', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(of({ ...createPreferences(), sms: true }));
    getPreferencesSpy.and.returnValue(of({ ...createPreferences(), sms: false }));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    // Lo local es lo unico que conserva los cambios del usuario: no hay endpoint
    // que los persista, asi que no puede pisarlo la respuesta del backend.
    expect(getCheckbox('sms').checked).toBeFalse();
  }));

  it('should render error state when the settings endpoint fails', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getText()).toContain('No fue posible cargar las preferencias.');
  }));

  it('should render error state', fakeAsync(() => {
    getPreferencesSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getText()).toContain('No fue posible cargar las preferencias.');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function getCheckbox(controlName: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[formcontrolname="${controlName}"]`) as HTMLInputElement;
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
  return { auth0UserId: 'auth0|123', email: 'cliente@conexion360.com', name: 'Cliente Demo', roles: [] };
}

function createPreferences(): UserNotificationPreferences {
  return {
    email: true,
    inApp: true,
    sms: false,
    shipmentStatusChanges: true,
    delivery: true,
    delays: true,
    shipmentEnRoute: false,
    deliveryReminders: false,
  };
}

