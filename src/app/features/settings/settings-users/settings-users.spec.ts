import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { SettingsUsers } from './settings-users';

describe('SettingsUsers', () => {
  let fixture: ComponentFixture<SettingsUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsUsers, NoopAnimationsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsUsers);
  });

  it('should explain that users and roles are managed in Auth0', () => {
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Gestión de usuarios');
    expect(content).toContain('Usuarios y roles se administran desde Auth0');
    expect(content).toContain('id_token');
  });
});
