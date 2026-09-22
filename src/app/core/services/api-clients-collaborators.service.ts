import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { mapMasterOperationResponse } from '../mappers/clients-collaborators.mapper';
import { MasterOperationResult } from '../models/clients-collaborators.model';

/**
 * Maestro de clientes colaboradores: alta de clientes, alta de colaboradores y
 * la asociación entre ambos.
 *
 * Los tres son `GET` con los datos en la query aunque escriban en la base: así
 * los expone el backend (`createcustomerdb`, `createcollaboratordb`,
 * `createcustomercollaboratordb`) y el SPA se limita a respetar el contrato. Por
 * eso mismo la pantalla nunca los dispara sola —siempre tras un clic explícito—
 * y no se cachean.
 *
 * A diferencia de `ApiSettingsService`, los identificadores no salen de la
 * identidad de Auth0: son los que escribe el administrador en el formulario.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiClientsCollaboratorsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.baseUrl}/settings`;

  createCustomer(clientId: string): Observable<MasterOperationResult> {
    return this.request('createcustomerdb', new HttpParams().set('clientId', clientId));
  }

  createCollaborator(collaboratorId: string): Observable<MasterOperationResult> {
    // El endpoint del colaborador también nombra `clientId` a su parámetro.
    return this.request('createcollaboratordb', new HttpParams().set('clientId', collaboratorId));
  }

  linkCustomerToCollaborator(clientId: string, collaboratorId: string): Observable<MasterOperationResult> {
    return this.request(
      'createcustomercollaboratordb',
      new HttpParams().set('clientId', clientId).set('collaborator', collaboratorId),
    );
  }

  private request(path: string, params: HttpParams): Observable<MasterOperationResult> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${path}`, { params })
      .pipe(map((response) => mapMasterOperationResponse(response)));
  }
}
