import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SearchFilters } from '../models/common.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { MyShipmentsPage, mapShipmentsPageResponse } from './shipments-page.mapper';

export type { MyShipmentsPage, MyShipmentsSummary } from './shipments-page.mapper';

@Injectable({
  providedIn: 'root',
})
export class ApiHistoryService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly historyUrl = `${environment.api.baseUrl}/myshipments/allhistory`;
  private readonly filteredHistoryUrl = `${environment.api.baseUrl}/myshipments/filterhistory`;

  search(filters: SearchFilters): Observable<MyShipmentsPage> {
    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.getSearchUrl(filters), {
          params: this.createParams(identity, filters),
        }),
      ),
      map((response) => mapShipmentsPageResponse(response, filters)),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }

  private createParams(identity: Auth0Identity, filters: SearchFilters): HttpParams {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.max(filters.pageSize ?? 10, 1);

    const params = new HttpParams()
      .set('idClient', identity.document ?? '')
      .set('page', String(page))
      .set('size', String(pageSize));

    return this.addFilterParams(params, filters);
  }

  private getSearchUrl(filters: SearchFilters): string {
    return this.hasFilters(filters) ? this.filteredHistoryUrl : this.historyUrl;
  }

  private hasFilters(filters: SearchFilters): boolean {
    return Boolean(filters.query?.trim() || filters.operationType || filters.transportMode);
  }

  private addFilterParams(params: HttpParams, filters: SearchFilters): HttpParams {
    let nextParams = params;
    const valueFilter = filters.query?.trim();

    if (valueFilter) {
      nextParams = nextParams.set('ValueFilter', valueFilter);
    }

    if (filters.operationType) {
      nextParams = nextParams.set('OperationType', filters.operationType);
    }

    if (filters.transportMode) {
      nextParams = nextParams.set('ShipmentMode', filters.transportMode);
    }

    return nextParams;
  }
}
