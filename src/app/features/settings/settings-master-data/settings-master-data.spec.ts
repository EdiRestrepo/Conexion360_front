import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { SettingsMasterData } from './settings-master-data';

describe('SettingsMasterData', () => {
  let fixture: ComponentFixture<SettingsMasterData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsMasterData, NoopAnimationsModule],
      providers: [provideRouter([])],
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

  it('should show a confirmation message when saving the configuration', () => {
    fixture.detectChanges();
    clickButton('Guardar configuración');
    fixture.detectChanges();

    expect(getText()).toContain('Configuración guardada.');
  });

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
