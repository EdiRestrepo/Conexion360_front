import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SettingsUser } from '../../../../../core/models/settings-user.model';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';

describe('ConfirmDeleteDialog', () => {
  let fixture: ComponentFixture<ConfirmDeleteDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDeleteDialog, boolean>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDeleteDialog, boolean>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: createUser() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteDialog);
    fixture.detectChanges();
  });

  it('enables deletion only after typing the user email', () => {
    expect(getConfirmButton().disabled).toBeTrue();

    typeConfirmation('  ArturoCalle@tcc.com ');
    getConfirmButton().click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('rejects scripts in the confirmation field', () => {
    typeConfirmation('<script>alert(1)</script>');

    expect(getText()).toContain('La información ingresada no es válida.');
    expect(getConfirmButton().disabled).toBeTrue();
  });

  it('caps the confirmation length', () => {
    expect(getInput().getAttribute('maxlength')).toBe('254');
  });

  function getInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function getConfirmButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.delete-dialog__confirm') as HTMLButtonElement;
  }

  function typeConfirmation(value: string): void {
    const input = getInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

function createUser(): SettingsUser {
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
  };
}
