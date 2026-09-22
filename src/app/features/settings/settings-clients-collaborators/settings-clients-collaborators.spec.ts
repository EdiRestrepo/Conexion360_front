import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { SettingsClientsCollaborators } from './settings-clients-collaborators';

describe('SettingsClientsCollaborators', () => {
  let fixture: ComponentFixture<SettingsClientsCollaborators>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsClientsCollaborators, NoopAnimationsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsClientsCollaborators);
  });

  it('should render the header and the pending content notice', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Maestro clientes colaborador');
    expect(text).toContain('Esta sección aún no tiene contenido.');
  });
});
