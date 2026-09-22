import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { NotificationSettings, UserNotificationPreferences } from '../../../core/models/notification.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { Auth0Identity } from '../../../core/models/user.model';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { SettingsNotifications } from './settings-notifications';

describe('SettingsNotifications', () => {
  let fixture: ComponentFixture<SettingsNotifications>;
  let getNotificationSettingsSpy: jasmine.Spy<() => Observable<NotificationSettings>>;
  let saveNotificationSettingsSpy: jasmine.Spy<
    (preferences: UserNotificationPreferences, settings: Pick<NotificationSettings, 'channelId' | 'eventId'>) => Observable<void>
  >;

  beforeEach(async () => {
    getNotificationSettingsSpy = jasmine
      .createSpy('getNotificationSettings')
      .and.returnValue(of(createSettings()));
    saveNotificationSettingsSpy = jasmine.createSpy('saveNotificationSettings').and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [SettingsNotifications, NoopAnimationsModule],
      providers: [provideRouter([]), 
        { provide: Auth0FacadeService, useValue: { user$: of(createIdentity()) } },
        {
          provide: ApiSettingsService,
          useValue: {
            getNotificationSettings: getNotificationSettingsSpy,
            saveNotificationSettings: saveNotificationSettingsSpy,
          },
        },
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

  it('should save what the user toggled with the ids the backend returned', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(of(createSettings({ channelId: 7, eventId: 9 })));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    getCheckbox('email').click();
    fixture.detectChanges();
    save();

    expect(saveNotificationSettingsSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ email: false }),
      jasmine.objectContaining({ channelId: 7, eventId: 9 }),
    );
    expect(getText()).toContain('Preferencias guardadas.');
  }));

  it('should apply the settings returned by the backend', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(of(createSettings({ preferences: { sms: true, delays: false } })));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getCheckbox('sms').checked).toBeTrue();
    expect(getCheckbox('delays').checked).toBeFalse();
  }));

  // El alta no devuelve los ids, así que el componente relee: sin eso, el
  // segundo guardado volvería a llamar a `createnotifications`.
  it('should reload the settings after saving so the next save updates', fakeAsync(() => {
    let stored = createSettings();
    getNotificationSettingsSpy.and.callFake(() => of(stored));
    saveNotificationSettingsSpy.and.callFake(() => {
      stored = createSettings({ channelId: 7, eventId: 9 });
      return of(undefined);
    });
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    save();
    expect(saveNotificationSettingsSpy).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ channelId: 0, eventId: 0 }));

    save();
    expect(saveNotificationSettingsSpy).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ channelId: 7, eventId: 9 }));
  }));

  it('should report when saving fails', fakeAsync(() => {
    saveNotificationSettingsSpy.and.returnValue(throwError(() => new Error('fallo')));
    render();

    save();

    expect(getText()).toContain('No fue posible guardar las preferencias.');
  }));

  it('should render error state when the settings endpoint fails', fakeAsync(() => {
    getNotificationSettingsSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsNotifications);
    render();

    expect(getText()).toContain('No fue posible cargar las preferencias.');
  }));

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function save(): void {
    clickButton('Guardar cambios');
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

function createSettings(
  overrides: Partial<Omit<NotificationSettings, 'preferences'>> & { preferences?: Partial<UserNotificationPreferences> } = {},
): NotificationSettings {
  return {
    channelId: overrides.channelId ?? 0,
    eventId: overrides.eventId ?? 0,
    preferences: {
      email: true,
      inApp: true,
      sms: false,
      shipmentStatusChanges: true,
      delivery: true,
      delays: true,
      shipmentEnRoute: false,
      deliveryReminders: false,
      ...(overrides.preferences ?? {}),
    },
  };
}
