import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { SettingsUser, SettingsUsersPage } from '../../../core/models/settings-user.model';
import { Auth0Identity } from '../../../core/models/user.model';
import { ApiSettingsUsersService } from '../../../core/services/api-settings-users.service';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { SettingsUsers } from './settings-users';

function createUser(overrides: Partial<SettingsUser> = {}): SettingsUser {
  return {
    userId: 'auth0|admin',
    email: 'edisonestival@gmail.com',
    userName: 'Edison Restrepo',
    nickname: 'edison',
    phoneNumber: '+573175766335',
    isBlocked: false,
    createdDate: '2026-08-12T09:31:00Z',
    updatedDate: '2026-08-30T08:57:00Z',
    fullName: 'Edison Restrepo',
    document: '8110357412',
    company: 'IAS',
    picture: null,
    role: 'ADMIN',
    lastLogin: '2026-08-30T08:57:00Z',
    emailVerified: true,
    acceptedDataPolicy: true,
    ...overrides,
  };
}

function createPage(users: SettingsUser[]): SettingsUsersPage {
  return { items: users, page: 1, pageSize: 10, totalItems: users.length, totalPages: 1 };
}

describe('SettingsUsers', () => {
  let fixture: ComponentFixture<SettingsUsers>;
  let usersService: jasmine.SpyObj<ApiSettingsUsersService>;

  async function setup(list: Observable<SettingsUsersPage>): Promise<void> {
    usersService = jasmine.createSpyObj<ApiSettingsUsersService>('ApiSettingsUsersService', [
      'list',
      'getById',
      'update',
      'delete',
    ]);
    usersService.list.and.returnValue(list);

    const identity: Auth0Identity = { auth0UserId: 'auth0|admin', email: 'edisonestival@gmail.com', roles: ['ADMIN'] };

    await TestBed.configureTestingModule({
      imports: [SettingsUsers, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ApiSettingsUsersService, useValue: usersService },
        { provide: Auth0FacadeService, useValue: { user$: of(identity) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsUsers);
    fixture.detectChanges();
  }

  it('lists the users returned by the API', async () => {
    await setup(
      of(
        createPage([
          createUser({ userId: 'auth0|client', fullName: 'Ana Gómez', nickname: 'anagomez', role: 'CLIENT' }),
        ]),
      ),
    );

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(usersService.list).toHaveBeenCalledWith(1, 10);
    expect(content).toContain('Ana Gómez');
    expect(content).toContain('Cliente');
    expect(content).toContain('IAS');
    expect(content).toContain('8110357412');
  });

  it('shows a dash for the name until the backend sends fullName, without falling back to email or userName', async () => {
    // La columna Nombre solo debe mostrar `fullName`: mientras el backend no lo
    // envíe, cae a "—" en vez de repetir el correo (que ya tiene su propia
    // columna), el userName o el nickname.
    await setup(of(createPage([createUser({ userName: 'edisonestival@gmail.com', fullName: '', nickname: 'edisonestival' })])));

    const row = (fixture.nativeElement as HTMLElement).querySelectorAll('.users-table__row')[1];
    const nameCell = row.querySelectorAll('[role="cell"]')[2];

    expect(nameCell.textContent?.trim()).toBe('—');
  });

  it('shows the empty state when there are no users', async () => {
    await setup(of(createPage([])));

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('No hay usuarios para mostrar');
  });

  it('shows the error state when the API fails', async () => {
    await setup(throwError(() => new Error('boom')));

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('No se pudo cargar la información');
    expect(content).toContain('Reintentar');
  });

  it('renders a dash for fields the backend does not expose yet', async () => {
    await setup(of(createPage([createUser({ userId: 'auth0|sinrol', role: null, company: '', document: '' })])));

    const roleCell = (fixture.nativeElement as HTMLElement).querySelectorAll('.users-table__row')[1];

    expect(roleCell.textContent).toContain('—');
  });

  it('disables blocking and deleting the signed-in admin', async () => {
    await setup(of(createPage([createUser()])));

    const actions = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.users-actions button');

    // [0] editar, [1] bloquear, [2] eliminar
    expect(actions[1].disabled).toBeTrue();
    expect(actions[2].disabled).toBeTrue();
  });

  it('does not call the API when toggling block on the signed-in admin', async () => {
    await setup(of(createPage([createUser()])));

    const component = fixture.componentInstance as unknown as { toggleBlocked: (user: SettingsUser) => void };
    component.toggleBlocked(createUser());

    expect(usersService.update).not.toHaveBeenCalled();
  });
});
