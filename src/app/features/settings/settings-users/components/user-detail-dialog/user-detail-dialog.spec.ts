import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NEVER, of, throwError } from 'rxjs';

import { SettingsRole, SettingsUser } from '../../../../../core/models/settings-user.model';
import { UserDetailDialog, UserDetailDialogData, UserDetailDialogResult } from './user-detail-dialog';

const roles: SettingsRole[] = [
  { id: 'rol_admin', name: 'ADMIN', description: 'Administrador' },
  { id: 'rol_client', name: 'CLIENT', description: 'Cliente' },
];

describe('UserDetailDialog', () => {
  let fixture: ComponentFixture<UserDetailDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UserDetailDialog, UserDetailDialogResult | null>>;

  async function render(data: Partial<UserDetailDialogData> = {}): Promise<void> {
    dialogRef = jasmine.createSpyObj<MatDialogRef<UserDetailDialog, UserDetailDialogResult | null>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [UserDetailDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { user: createUser(), isSelf: false, ...data } satisfies UserDetailDialogData,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailDialog);
    fixture.detectChanges();
  }

  function getCheckbox(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.user-dialog__toggle input') as HTMLInputElement;
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('checks the box for a user that is not blocked', async () => {
    await render({ user: createUser({ isBlocked: false }) });

    expect(getCheckbox().checked).toBeTrue();
    expect(getText()).toContain('Usuario activo');
    expect(getText()).toContain('Puede iniciar sesión en la plataforma.');
  });

  it('leaves the box unchecked for a blocked user', async () => {
    await render({ user: createUser({ isBlocked: true }) });

    expect(getCheckbox().checked).toBeFalse();
    expect(getText()).toContain('no podrá iniciar sesión');
  });

  it('updates the hint when the box is toggled', async () => {
    await render({ user: createUser({ isBlocked: false }) });

    const checkbox = getCheckbox();
    checkbox.click();
    fixture.detectChanges();

    expect(getText()).toContain('no podrá iniciar sesión');
  });

  // El estado va por `updateuserstatus`: solo cambia el estado, sin PATCH de perfil.
  it('returns only the new status when just the checkbox changes', async () => {
    await render({ user: createUser({ isBlocked: true }) });

    getCheckbox().click();
    fixture.detectChanges();
    getSaveButton().click();

    expect(dialogRef.close).toHaveBeenCalledWith({ profile: null, isActive: true });
  });

  it('closes without changes when nothing was edited', async () => {
    await render();

    getSaveButton().click();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('prefills the phone from the `phone` field the backend sends', async () => {
    await render({ user: createUser({ phone: '+573001112233', phoneNumber: '' }) });

    expect(getInput('input[type="tel"]').value).toBe('+573001112233');
  });

  it('sends the edited profile keeping the Auth0 root phoneNumber untouched', async () => {
    await render({ user: createUser({ phoneNumber: '' }) });

    typeInto('input[type="tel"]', '+573009998877');
    typeInto('input[formControlName="company"]', '  ITM  ');
    getSaveButton().click();

    expect(dialogRef.close).toHaveBeenCalledWith({
      profile: jasmine.objectContaining({ phone: '+573009998877', phoneNumber: null, company: 'ITM', roleId: 'rol_admin' }),
      isActive: null,
    });
  });

  it('lets the admin pick another role from listroles', async () => {
    await render({ roles$: of(roles) });

    const select = getInput('select') as unknown as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual(['Administrador', 'Cliente']);

    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    getSaveButton().click();

    expect(dialogRef.close).toHaveBeenCalledWith({
      profile: jasmine.objectContaining({ roleId: 'rol_client', roleName: 'CLIENT' }),
      isActive: null,
    });
  });

  it('keeps only the current role while roles load', async () => {
    await render({ roles$: NEVER });

    const select = getInput('select') as unknown as HTMLSelectElement;

    expect(select.options.length).toBe(1);
    expect(getText()).toContain('Cargando los roles de Auth0');
  });

  it('warns and keeps the current role when listroles fails', async () => {
    await render({ roles$: throwError(() => new Error('boom')) });

    expect(getText()).toContain('No fue posible cargar los roles');
    expect((getInput('select') as unknown as HTMLSelectElement).options.length).toBe(1);
  });

  it('shows the role read-only on the own profile', async () => {
    await render({ isSelf: true, roles$: of(roles) });

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(getText()).toContain('Administrador');
  });

  it('rejects scripts in the full name', async () => {
    await render();

    typeInto('input[formControlName="fullName"]', '<img src=x onerror=alert(1)>');

    expect(getText()).toContain('La información ingresada no es válida.');
    expect(getSaveButton().disabled).toBeTrue();
  });

  it('hides the control on the admin own profile', async () => {
    await render({ isSelf: true });

    expect(fixture.nativeElement.querySelector('.user-dialog__toggle')).toBeNull();
  });

  it('rejects scripts in the email and does not close the dialog', async () => {
    await render();

    typeInto('input[type="email"]', '<script>alert(1)</script>@tcc.com');
    getSaveButton().click();

    expect(getText()).toContain('La información ingresada no es válida.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('rejects a phone that is not in E.164 format', async () => {
    await render();

    typeInto('input[type="tel"]', '3175766335');

    expect(getText()).toContain('El teléfono debe ir en formato internacional');
    expect(getSaveButton().disabled).toBeTrue();
  });

  it('caps the length of the phone and the email', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('input[type="tel"]').getAttribute('maxlength')).toBe('16');
    expect(fixture.nativeElement.querySelector('input[type="email"]').getAttribute('maxlength')).toBe('254');
  });

  function getInput(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  }

  function typeInto(selector: string, value: string): void {
    const input = getInput(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function getSaveButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelectorAll('.user-dialog__actions button')[1] as HTMLButtonElement;
  }
});

function createUser(overrides: Partial<SettingsUser> = {}): SettingsUser {
  return {
    userId: 'auth0|1',
    email: 'arturocalle@tcc.com',
    userName: 'arturocalle',
    nickname: 'arturocalle',
    phoneNumber: '',
    phone: '+573175766335',
    isBlocked: false,
    createdDate: null,
    updatedDate: null,
    fullName: 'Arturo Calle',
    document: '123456789',
    company: 'TCC',
    roleId: 'rol_admin',
    roleName: 'ADMIN',
    picture: null,
    role: 'ADMIN',
    lastLogin: null,
    emailVerified: null,
    acceptedDataPolicy: null,
    ...overrides,
  };
}
