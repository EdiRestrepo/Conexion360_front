import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { SettingsUser } from '../../../core/models/settings.model';
import { SettingsService } from '../../../core/services/settings.service';
import { UserRole } from '../../../core/models/user.model';
import { SettingsUsers } from './settings-users';

describe('SettingsUsers', () => {
  let fixture: ComponentFixture<SettingsUsers>;
  let searchUsersSpy: jasmine.Spy<(query: string, role: UserRole | 'ALL') => Observable<SettingsUser[]>>;
  let toggleUserStatusSpy: jasmine.Spy<(userId: string) => Observable<SettingsUser | null>>;

  beforeEach(async () => {
    searchUsersSpy = jasmine.createSpy('searchUsers').and.callFake((query: string, role: UserRole | 'ALL') =>
      of(filterUsers(query, role)),
    );
    toggleUserStatusSpy = jasmine.createSpy('toggleUserStatus').and.returnValue(of({ ...createUsers()[0], status: 'INACTIVE' }));

    await TestBed.configureTestingModule({
      imports: [SettingsUsers, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: SettingsService, useValue: { searchUsers: searchUsersSpy, toggleUserStatus: toggleUserStatusSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsUsers);
  });

  it('should render simulated users', fakeAsync(() => {
    render();

    expect(getText()).toContain('Gestión de usuarios');
    expect(getText()).toContain('Laura Méndez');
    expect(getText()).toContain('Analista operativo');
  }));

  it('should search users by text', fakeAsync(() => {
    render();

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Nutresa';
    input.dispatchEvent(new Event('input'));
    tick(260);
    fixture.detectChanges();

    expect(searchUsersSpy).toHaveBeenCalledWith('Nutresa', 'ALL');
    expect(getText()).toContain('Carlos Restrepo');
    expect(getText()).not.toContain('Laura Méndez');
  }));

  it('should filter users by role', fakeAsync(() => {
    render();

    const select = (fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>)[1];
    select.value = 'ADMIN';
    select.dispatchEvent(new Event('change'));
    tick(260);
    fixture.detectChanges();

    expect(searchUsersSpy).toHaveBeenCalledWith('', 'ADMIN');
    expect(getText()).toContain('Admin Conexion360');
    expect(getText()).not.toContain('Laura Méndez');
  }));

  it('should toggle user status with a simulated update', fakeAsync(() => {
    render();

    clickButton('Desactivar');
    tick();
    fixture.detectChanges();

    expect(toggleUserStatusSpy).toHaveBeenCalledWith('user-001');
    expect(getText()).toContain('Actualización guardada.');
  }));

  it('should render error state', fakeAsync(() => {
    searchUsersSpy.and.returnValue(throwError(() => new Error('fallo')));
    fixture = TestBed.createComponent(SettingsUsers);
    render();

    expect(getText()).toContain('No fue posible cargar usuarios.');
  }));

  function render(): void {
    fixture.detectChanges();
    tick(260);
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

function filterUsers(query: string, role: UserRole | 'ALL'): SettingsUser[] {
  const normalizedQuery = query.trim().toLowerCase();
  return createUsers().filter((user) => {
    const matchesRole = role === 'ALL' ? true : user.role === role;
    const matchesQuery = normalizedQuery ? `${user.fullName} ${user.email} ${user.company}`.toLowerCase().includes(normalizedQuery) : true;
    return matchesRole && matchesQuery;
  });
}

function createUsers(): SettingsUser[] {
  return [
    { id: 'user-001', fullName: 'Edison Estival', email: 'edison@demo.com', company: 'Cliente demo', role: 'CLIENT', status: 'ACTIVE' },
    { id: 'user-002', fullName: 'Laura Méndez', email: 'laura@conexion360.com', company: 'TCC', role: 'ANALISTAOPE', status: 'ACTIVE' },
    { id: 'user-003', fullName: 'Admin Conexion360', email: 'admin@conexion360.com', company: 'Conexion360', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'user-004', fullName: 'Carlos Restrepo', email: 'carlos@cliente.com', company: 'Nutresa', role: 'CLIENT', status: 'INACTIVE' },
  ];
}
