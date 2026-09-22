import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, WritableSignal, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, take } from 'rxjs';

import { mapMasterOperationResponse } from '../../../core/mappers/clients-collaborators.mapper';
import { MasterOperationResult } from '../../../core/models/clients-collaborators.model';
import { ApiClientsCollaboratorsService } from '../../../core/services/api-clients-collaborators.service';
import type { DocumentForm, LinkForm, MasterActionStatus } from '../models/settings-view.model';

const idleStatus: MasterActionStatus = { state: 'idle', message: null };
const invalidStatus: MasterActionStatus = { state: 'error', message: 'Escribe el documento para continuar.' };

function documentControl(): FormControl<string> {
  return new FormControl('', { nonNullable: true, validators: [Validators.required] });
}

/**
 * Maestro de clientes colaboradores: da de alta un cliente, da de alta un
 * colaborador y asocia uno con otro.
 *
 * Son tres acciones sueltas contra el backend, sin listado que consultar: el
 * API solo expone las altas, así que la pantalla no puede mostrar lo que ya
 * existe ni confirmar el resultado más allá del mensaje que le devuelvan.
 */
@Component({
  selector: 'app-settings-clients-collaborators',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
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

  protected createCustomer(): void {
    const clientId = this.readDocument(this.customerForm);

    if (!clientId) {
      this.customerStatus.set(invalidStatus);
      return;
    }

    this.execute(this.customerStatus, this.masterService.createCustomer(clientId), 'Cliente creado.', this.customerForm);
  }

  protected createCollaborator(): void {
    const collaboratorId = this.readDocument(this.collaboratorForm);

    if (!collaboratorId) {
      this.collaboratorStatus.set(invalidStatus);
      return;
    }

    this.execute(
      this.collaboratorStatus,
      this.masterService.createCollaborator(collaboratorId),
      'Colaborador creado.',
      this.collaboratorForm,
    );
  }

  protected linkCustomerToCollaborator(): void {
    const { clientId, collaborator } = this.linkForm.getRawValue();
    const documentId = clientId.trim();
    const collaboratorId = collaborator.trim();

    if (!documentId || !collaboratorId) {
      this.linkForm.markAllAsTouched();
      this.linkStatus.set(invalidStatus);
      return;
    }

    this.execute(
      this.linkStatus,
      this.masterService.linkCustomerToCollaborator(documentId, collaboratorId),
      'Cliente asociado al colaborador.',
      this.linkForm,
    );
  }

  private readDocument(form: FormGroup<DocumentForm>): string {
    const value = form.getRawValue().clientId.trim();

    if (!value) {
      form.markAllAsTouched();
    }

    return value;
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
  ): void {
    status.set({ state: 'pending', message: null });
    request.pipe(take(1)).subscribe({
      next: (result) => {
        form.reset();
        status.set({ state: 'success', message: result.message || successMessage });
      },
      error: (error: unknown) => status.set({ state: 'error', message: readErrorMessage(error) }),
    });
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
