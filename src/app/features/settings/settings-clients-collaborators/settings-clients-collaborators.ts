import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap, take } from 'rxjs';

import { mapMasterOperationResponse } from '../../../core/mappers/clients-collaborators.mapper';
import { CustomerCollaboratorRelation, MasterOperationResult } from '../../../core/models/clients-collaborators.model';
import { ApiClientsCollaboratorsService } from '../../../core/services/api-clients-collaborators.service';
import { getVisibleErrorMessage } from '../../../core/utils/input-error-message';
import { inputRules } from '../../../core/utils/input-rules';
import { validatorsFor } from '../../../core/utils/input-validators';
import type { DocumentForm, LinkForm, MasterActionStatus, MasterListState } from '../models/settings-view.model';
import { MasterList } from './components/master-list/master-list';

const idleStatus: MasterActionStatus = { state: 'idle', message: null };
const invalidStatus: MasterActionStatus = { state: 'error', message: 'Corrige los campos marcados para continuar.' };

function documentControl(): FormControl<string> {
  return new FormControl('', { nonNullable: true, validators: validatorsFor(inputRules.document) });
}

/**
 * Maestro de clientes colaboradores: da de alta un cliente, da de alta un
 * colaborador y asocia uno con otro.
 *
 * Cada tarjeta muestra bajo su formulario lo que ya está parametrizado, y ese
 * listado se recarga tras un alta exitosa: es la confirmación de que quedó
 * guardado. Los documentos ya registrados alimentan además las sugerencias del
 * formulario de asociación.
 */
@Component({
  selector: 'app-settings-clients-collaborators',
  imports: [MasterList, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-clients-collaborators.html',
  styleUrl: './settings-clients-collaborators.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsClientsCollaborators {
  private readonly masterService = inject(ApiClientsCollaboratorsService);

  protected readonly customerForm = new FormGroup<DocumentForm>({ clientId: documentControl() });
  protected readonly collaboratorForm = new FormGroup<DocumentForm>({ clientId: documentControl() });
  protected readonly linkForm = new FormGroup<LinkForm>({
    clientId: documentControl(),
    collaborator: documentControl(),
  });

  protected readonly customerStatus = signal<MasterActionStatus>(idleStatus);
  protected readonly collaboratorStatus = signal<MasterActionStatus>(idleStatus);
  protected readonly linkStatus = signal<MasterActionStatus>(idleStatus);
  protected readonly documentRule = inputRules.document;

  private readonly customersRefresh$ = new BehaviorSubject<void>(undefined);
  private readonly collaboratorsRefresh$ = new BehaviorSubject<void>(undefined);
  private readonly relationsRefresh$ = new BehaviorSubject<void>(undefined);

  protected readonly customers = this.loadList(this.customersRefresh$, () => this.masterService.listCustomers());
  protected readonly collaborators = this.loadList(this.collaboratorsRefresh$, () =>
    this.masterService.listCollaborators(),
  );
  protected readonly relations = this.loadList<CustomerCollaboratorRelation>(this.relationsRefresh$, () =>
    this.masterService.listCustomerCollaborators(),
  );

  protected reloadCustomers(): void {
    this.customersRefresh$.next();
  }

  protected reloadCollaborators(): void {
    this.collaboratorsRefresh$.next();
  }

  protected reloadRelations(): void {
    this.relationsRefresh$.next();
  }

  protected fieldError(control: FormControl<string>): string | null {
    return getVisibleErrorMessage(control, this.documentRule);
  }

  protected createCustomer(): void {
    if (!this.canSubmit(this.customerForm, this.customerStatus)) {
      return;
    }

    const clientId = this.customerForm.getRawValue().clientId.trim();

    this.execute(
      this.customerStatus,
      this.masterService.createCustomer(clientId),
      'Cliente creado.',
      this.customerForm,
      this.customersRefresh$,
    );
  }

  protected createCollaborator(): void {
    if (!this.canSubmit(this.collaboratorForm, this.collaboratorStatus)) {
      return;
    }

    const collaboratorId = this.collaboratorForm.getRawValue().clientId.trim();

    this.execute(
      this.collaboratorStatus,
      this.masterService.createCollaborator(collaboratorId),
      'Colaborador creado.',
      this.collaboratorForm,
      this.collaboratorsRefresh$,
    );
  }

  protected linkCustomerToCollaborator(): void {
    if (!this.canSubmit(this.linkForm, this.linkStatus)) {
      return;
    }

    const { clientId, collaborator } = this.linkForm.getRawValue();
    const documentId = clientId.trim();
    const collaboratorId = collaborator.trim();

    this.execute(
      this.linkStatus,
      this.masterService.linkCustomerToCollaborator(documentId, collaboratorId),
      'Cliente asociado al colaborador.',
      this.linkForm,
      this.relationsRefresh$,
    );
  }

  /**
   * Con un campo inválido no se llama al backend (HU1 – CA02/CA03): cada campo
   * muestra su propio error y el aviso general apunta a ellos.
   */
  private canSubmit(form: FormGroup, status: WritableSignal<MasterActionStatus>): boolean {
    if (form.valid) {
      return true;
    }

    form.markAllAsTouched();
    status.set(invalidStatus);
    return false;
  }

  /**
   * El formulario se limpia solo cuando el alta salió bien: si falló, lo que
   * escribió el administrador sigue ahí para corregirlo y reintentar.
   */
  private execute(
    status: WritableSignal<MasterActionStatus>,
    request: Observable<MasterOperationResult>,
    successMessage: string,
    form: FormGroup,
    listRefresh$: BehaviorSubject<void>,
  ): void {
    status.set({ state: 'pending', message: null });
    request.pipe(take(1)).subscribe({
      next: (result) => {
        form.reset();
        status.set({ state: 'success', message: result.message || successMessage });
        listRefresh$.next();
      },
      error: (error: unknown) => status.set({ state: 'error', message: readErrorMessage(error) }),
    });
  }

  /** Se llama desde los inicializadores de campo, donde `toSignal` tiene contexto de inyección. */
  private loadList<T>(refresh$: Observable<void>, request: () => Observable<T[]>): Signal<MasterListState<T>> {
    return toSignal(
      refresh$.pipe(
        switchMap(() =>
          request().pipe(
            map((items): MasterListState<T> => ({ state: items.length > 0 ? 'success' : 'empty', items })),
            catchError(() => of<MasterListState<T>>({ state: 'error', items: [] })),
            startWith<MasterListState<T>>({ state: 'loading', items: [] }),
          ),
        ),
      ),
      { requireSync: true },
    );
  }
}

/**
 * El backend explica en el cuerpo por qué rechazó el alta («el cliente ya
 * existe»), y eso le sirve más a quien está en la pantalla que un texto
 * genérico. Si no hay cuerpo o no trae mensaje, se cae al texto propio.
 */
function readErrorMessage(error: unknown): string {
  const message = error instanceof HttpErrorResponse ? mapMasterOperationResponse(error.error).message : '';

  return message || 'No fue posible completar la operación.';
}
