import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ShipmentDataSource } from '../contracts/shipment-data-source';
import { mapReportsResponse } from '../mappers/reports.mapper';
import { ReportMetrics } from '../models/shipment.model';
import { Auth0Identity } from '../models/user.model';
import { mockTopClients } from '../../mocks/data/mock-top-clients';
import { Auth0FacadeService } from './auth0-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ApiReportsService implements ShipmentDataSource {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly reportsUrl = `${environment.api.baseUrl}/reports/home`;

  getReportMetrics(): Observable<ReportMetrics> {
    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.reportsUrl, {
          params: new HttpParams().set('idClient', identity.document ?? ''),
        }),
      ),
      map((response) => this.withMockedTopClients(mapReportsResponse(response))),
    );
  }

  /**
   * Provisional: `GET /reports/home` no devuelve ranking de clientes, así que
   * la tarjeta "Top clientes por cantidad de envíos" se sigue pintando con
   * datos simulados. Quitar este respaldo —y el import de `mockTopClients`—
   * en cuanto el backend incluya `topClients` en la respuesta.
   */
  private withMockedTopClients(metrics: ReportMetrics): ReportMetrics {
    if (metrics.topClients.length > 0) {
      return metrics;
    }

    return { ...metrics, topClients: mockTopClients };
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
