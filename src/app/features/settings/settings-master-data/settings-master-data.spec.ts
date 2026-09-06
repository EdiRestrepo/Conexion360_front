import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { MasterSettings } from '../../../core/models/settings.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { SettingsMasterData } from './settings-master-data';

describe('SettingsMasterData', () => {
  let fixture: ComponentFixture<SettingsMasterData>;
  let getMasterSettingsSpy: jasmine.Spy<() => Observable<MasterSettings>>;

  beforeEach(async () => {
    getMasterSettingsSpy = jasmine.createSpy('getMasterSettings').and.returnValue(of(createSettings()));

    await TestBed.configureTestingModule({
      imports: [SettingsMasterData, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: ApiSettingsService, useValue: { getMasterSettings: getMasterSettingsSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsMasterData);
  });

  it('should render the general parameters, localization and system sections', () => {
    fixture.detectChanges();

    expect(getText()).toContain('Parámetros generales');
    expect(getText()).toContain('Actualización automática de seguimiento');
    expect(getText()).toContain('Exigir carga de documentos');
    expect(getText()).toContain('Seguimiento público');
    expect(getText()).toContain('Localización');
    expect(getText()).toContain('Sistema');
    expect(getText()).not.toContain('Catálogos operativos');
  });

  it('should reflect the values returned by the backend', () => {
    fixture.detectChanges();

    const switches = fixture.nativeElement.querySelectorAll('.static-switch') as NodeListOf<HTMLElement>;

    expect(switches.length).toBe(3);
    expect(switches[0].classList).toContain('static-switch--on');
    expect(switches[1].classList).not.toContain('static-switch--on');
    expect(switches[2].classList).toContain('static-switch--on');

    const retention = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    expect(retention.value).toBe('365');
  });

  it('empareja las etiquetas del backend con el catálogo', async () => {
    fixture.detectChanges();
    // El autocompletar escribe en el cuadro en un microtask, no en la pasada de
    // detección de cambios.
    await fixture.whenStable();

    // El backend escribe `America/Bogota(UTC-5)` y `USD - Dólar`; se muestran la
    // zona IANA y la moneda ISO que les corresponden, con su etiqueta canónica.
    expect(getField('Zona horaria').value).toBe('America/Bogota (UTC-5)');
    expect(getField('Moneda predeterminada').value).toBe('USD - Dólar estadounidense');
    expect(getField('Idioma').value).toBe('Español');
  });

  it('conserva un valor irreconocible en vez de sustituirlo por el más parecido', async () => {
    getMasterSettingsSpy.and.returnValue(of({ ...createSettings(), timeZone: 'Bogotá, hora local' }));
    fixture = TestBed.createComponent(SettingsMasterData);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getField('Zona horaria').value).toBe('Bogotá, hora local');
  });

  it('should render the error state when the backend fails', () => {
    getMasterSettingsSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsMasterData);
    fixture.detectChanges();

    expect(getText()).toContain('No fue posible cargar la configuración maestra.');
  });

  it('should say that the configuration cannot be saved yet', () => {
    fixture.detectChanges();
    clickButton('Guardar configuración');
    fixture.detectChanges();

    expect(getText()).toContain('el backend todavía no expone un endpoint para guardarlos');
  });

  function createSettings(): MasterSettings {
    return {
      automaticTrackingUpdate: true,
      requireDocumentUpload: false,
      publicMonitoring: true,
      currency: 'USD - Dólar',
      language: 'Español',
      timeZone: 'America/Bogota(UTC-5)',
      dataRetentionDays: 365,
    };
  }

  function getField(label: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((item) => item.textContent?.includes(label));
    if (!button) {
      throw new Error(`No se encontró el botón ${label}`);
    }
    button.click();
  }
});
