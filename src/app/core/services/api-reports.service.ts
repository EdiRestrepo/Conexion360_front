import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ShipmentDataSource } from '../contracts/shipment-data-source';
import { mapReportsResponse } from '../mappers/reports.mapper';
import { ReportMetrics } from '../models/shipment.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ApiReportsService implements ShipmentDataSource {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly reportsUrl = `${environment.api.baseUrl}/reports/home`;

  /**
   * `idQueryClient` filtra el reporte por un cliente. El backend
   * (`ClientAccessResolver`) solo lo acepta si el rol del token puede verlo:
   * ADMIN, cualquiera; ANALISTAOPE y ANALISTASAC, solo los clientes que tienen
   * asignados en `customers_of_collaborators`. Un cliente ajeno vuelve como error.
   */
  getReportMetrics(idQueryClient = ''): Observable<ReportMetrics> {
    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.reportsUrl, {
          params: new HttpParams().set('idClient', identity.document ?? '').set('idQueryClient', idQueryClient.trim()),
        }),
      ),
      map((response) => mapReportsResponse(response)),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
