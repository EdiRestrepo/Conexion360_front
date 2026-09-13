import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SettingsUser, SettingsUserUpdate } from '../../../../../core/models/settings-user.model';
import { UserDetailDialog, UserDetailDialogData } from './user-detail-dialog';

describe('UserDetailDialog', () => {
  let fixture: ComponentFixture<UserDetailDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UserDetailDialog, SettingsUserUpdate | null>>;

  async function render(data: Partial<UserDetailDialogData> = {}): Promise<void> {
    dialogRef = jasmine.createSpyObj<MatDialogRef<UserDetailDialog, SettingsUserUpdate | null>>('MatDialogRef', ['close']);

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

  // La casilla habla en positivo y el API en negativo: si la inversión se pierde,
  // "activar" bloquearía al usuario sin que nada más falle.
  it('sends isBlocked inverted from the checkbox', async () => {
    await render({ user: createUser({ isBlocked: true }) });

    getCheckbox().click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.user-dialog__actions button')[1] as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ isBlocked: false }));
  });

  it('hides the control on the admin own profile', async () => {
    await render({ isSelf: true });

    expect(fixture.nativeElement.querySelector('.user-dialog__toggle')).toBeNull();
  });
});

function createUser(overrides: Partial<SettingsUser> = {}): SettingsUser {
  return {
    userId: 'auth0|1',
    email: 'arturocalle@tcc.com',
    userName: 'arturocalle',
    nickname: 'arturocalle',
    phoneNumber: '+573175766335',
    isBlocked: false,
    createdDate: null,
    updatedDate: null,
    fullName: 'Arturo Calle',
    document: '123456789',
    company: 'TCC',
    picture: null,
    role: null,
    lastLogin: null,
    emailVerified: null,
    acceptedDataPolicy: null,
    ...overrides,
  };
}
