import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { MasterOperationResult } from '../../../core/models/clients-collaborators.model';
import { ApiClientsCollaboratorsService } from '../../../core/services/api-clients-collaborators.service';
import { SettingsClientsCollaborators } from './settings-clients-collaborators';

describe('SettingsClientsCollaborators', () => {
  let fixture: ComponentFixture<SettingsClientsCollaborators>;
  let createCustomerSpy: jasmine.Spy<(clientId: string) => Observable<MasterOperationResult>>;
  let createCollaboratorSpy: jasmine.Spy<(collaboratorId: string) => Observable<MasterOperationResult>>;
  let linkSpy: jasmine.Spy<(clientId: string, collaboratorId: string) => Observable<MasterOperationResult>>;

  beforeEach(async () => {
    createCustomerSpy = jasmine.createSpy('createCustomer').and.returnValue(of({ message: '' }));
    createCollaboratorSpy = jasmine.createSpy('createCollaborator').and.returnValue(of({ message: '' }));
    linkSpy = jasmine.createSpy('linkCustomerToCollaborator').and.returnValue(of({ message: '' }));

    await TestBed.configureTestingModule({
      imports: [SettingsClientsCollaborators, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ApiClientsCollaboratorsService,
          useValue: {
            createCustomer: createCustomerSpy,
            createCollaborator: createCollaboratorSpy,
            linkCustomerToCollaborator: linkSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsClientsCollaborators);
    fixture.detectChanges();
  });

  it('should render the three master actions', () => {
    expect(getText()).toContain('Crear cliente');
    expect(getText()).toContain('Crear colaborador');
    expect(getText()).toContain('Asociar cliente a colaborador');
  });

  it('should create a customer and clear the form', fakeAsync(() => {
    typeInto(0, '  123456789  ');
    submit(0);

    // Se envia sin los espacios que haya pegado el administrador.
    expect(createCustomerSpy).toHaveBeenCalledWith('123456789');
    expect(getText()).toContain('Cliente creado.');
    expect(getInput(0).value).toBe('');
  }));

  it('should create a collaborator', fakeAsync(() => {
    typeInto(1, '1234567890');
    submit(1);

    expect(createCollaboratorSpy).toHaveBeenCalledWith('1234567890');
    expect(getText()).toContain('Colaborador creado.');
  }));

  it('should link a customer to a collaborator', fakeAsync(() => {
    typeInto(2, '123456789');
    typeInto(3, '1234567890');
    submit(2);

    expect(linkSpy).toHaveBeenCalledWith('123456789', '1234567890');
    expect(getText()).toContain('Cliente asociado al colaborador.');
  }));

  it('should show the message returned by the backend instead of the default one', fakeAsync(() => {
    createCustomerSpy.and.returnValue(of({ message: 'Cliente ya registrado previamente' }));
    typeInto(0, '123456789');
    submit(0);

    expect(getText()).toContain('Cliente ya registrado previamente');
  }));

  it('should not call the backend when the document is empty', fakeAsync(() => {
    typeInto(0, '   ');
    submit(0);

    expect(createCustomerSpy).not.toHaveBeenCalled();
    expect(getText()).toContain('Corrige los campos marcados para continuar.');
    expect(getText()).toContain('Este campo es obligatorio.');
  }));

  it('should require both documents before linking', fakeAsync(() => {
    typeInto(2, '123456789');
    submit(2);

    expect(linkSpy).not.toHaveBeenCalled();
    expect(getText()).toContain('Corrige los campos marcados para continuar.');
  }));

  it('should reject scripts in the document and not call the backend', fakeAsync(() => {
    typeInto(0, '<script>alert(1)</script>');
    submit(0);

    expect(createCustomerSpy).not.toHaveBeenCalled();
    expect(getText()).toContain('La información ingresada no es válida.');
  }));

  it('should reject documents with letters or separators', fakeAsync(() => {
    typeInto(1, '900.123.456-7');
    submit(1);

    expect(createCollaboratorSpy).not.toHaveBeenCalled();
    expect(getText()).toContain('Solo se permiten números, sin puntos, guiones ni espacios.');
  }));

  it('should enforce the document length limits', fakeAsync(() => {
    typeInto(0, '1234');
    submit(0);

    expect(getText()).toContain('Mínimo 5 caracteres.');

    typeInto(0, '1'.repeat(16));
    submit(0);

    expect(createCustomerSpy).not.toHaveBeenCalled();
    expect(getText()).toContain('Máximo 15 caracteres.');
    expect(getInput(0).getAttribute('maxlength')).toBe('15');
  }));

  it('should surface the backend message when the request fails and keep what was typed', fakeAsync(() => {
    createCustomerSpy.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El cliente ya existe' } })),
    );
    typeInto(0, '123456789');
    submit(0);

    expect(getText()).toContain('El cliente ya existe');
    expect(getInput(0).value).toBe('123456789');
  }));

  it('should fall back to a generic message when the failure has no body', fakeAsync(() => {
    createCustomerSpy.and.returnValue(throwError(() => new Error('sin red')));
    typeInto(0, '123456789');
    submit(0);

    expect(getText()).toContain('No fue posible completar la operación.');
  }));

  function getInput(index: number): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('input')[index] as HTMLInputElement;
  }

  function typeInto(index: number, value: string): void {
    const input = getInput(index);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(formIndex: number): void {
    const form = (fixture.nativeElement as HTMLElement).querySelectorAll('form')[formIndex] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
