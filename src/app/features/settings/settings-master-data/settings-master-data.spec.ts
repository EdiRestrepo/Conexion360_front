import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { MasterDataGroup } from '../../../core/models/settings.model';
import { MockSettingsService } from '../../../mocks/services/mock-settings.service';
import { SettingsMasterData } from './settings-master-data';

describe('SettingsMasterData', () => {
  let fixture: ComponentFixture<SettingsMasterData>;
  let getMasterDataSpy: jasmine.Spy<() => Observable<MasterDataGroup[]>>;
  let simulateMasterDataSaveSpy: jasmine.Spy<(groupId: string) => Observable<MasterDataGroup | null>>;

  beforeEach(async () => {
    getMasterDataSpy = jasmine.createSpy('getMasterData').and.returnValue(of(createMasterData()));
    simulateMasterDataSaveSpy = jasmine.createSpy('simulateMasterDataSave').and.returnValue(of(createMasterData()[0]));

    await TestBed.configureTestingModule({
      imports: [SettingsMasterData, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: MockSettingsService, useValue: { getMasterData: getMasterDataSpy, simulateMasterDataSave: simulateMasterDataSaveSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsMasterData);
  });

  it('should render master data groups', fakeAsync(() => {
    render();

    expect(getText()).toContain('Estados');
    expect(getText()).toContain('Modalidades');
    expect(getText()).toContain('Incoterms');
    expect(getText()).toContain('Tipos de contenedor');
  }));

  it('should save master data changes in simulated mode', fakeAsync(() => {
    render();

    clickButton('Guardar');
    tick();
    fixture.detectChanges();

    expect(simulateMasterDataSaveSpy).toHaveBeenCalledWith('statuses');
    expect(getText()).toContain('Cambios maestros guardados de forma simulada.');
  }));

  it('should render empty state', fakeAsync(() => {
    getMasterDataSpy.and.returnValue(of([]));
    fixture = TestBed.createComponent(SettingsMasterData);
    render();

    expect(getText()).toContain('No hay catálogos maestros disponibles.');
  }));

  it('should render error state and retry', fakeAsync(() => {
    getMasterDataSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsMasterData);
    render();

    expect(getText()).toContain('No fue posible cargar los catálogos maestros.');
    getMasterDataSpy.and.returnValue(of(createMasterData()));
    clickButton('Reintentar');
    tick();
    fixture.detectChanges();

    expect(getText()).toContain('Estados');
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
      throw new Error(`No se encontró el botón ${label}`);
    }
    button.click();
  }
});

function createMasterData(): MasterDataGroup[] {
  return [
    { id: 'statuses', title: 'Estados', items: ['Pendiente', 'En tránsito', 'Entregado'] },
    { id: 'modes', title: 'Modalidades', items: ['Aéreo', 'Marítimo'] },
    { id: 'documents', title: 'Tipos de documento', items: ['HBL', 'AWB'] },
    { id: 'incoterms', title: 'Incoterms', items: ['FOB', 'DAP'] },
    { id: 'containers', title: 'Tipos de contenedor', items: ['20GP', '40HC'] },
  ];
}
