import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, of, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { mapShipmentDetailResponse } from '../mappers/shipment-detail.mapper';
import { Shipment } from '../models/shipment.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ApiShipmentDetailService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly detailUrl = `${environment.api.baseUrl}/myshipments/detailsshipments`;

  getDetail(documentNumber: string, shipmentId = ''): Observable<Shipment | null> {
    const document = documentNumber.trim();

    if (!document) {
      return of(null);
    }

    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.detailUrl, {
          params: new HttpParams().set('idClient', identity.document ?? '').set('documentNumber', document),
        }),
      ),
      map((response) => mapShipmentDetailResponse(response, shipmentId)),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
