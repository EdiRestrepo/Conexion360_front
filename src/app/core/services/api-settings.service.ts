import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { mapMasterSettingsResponse, mapNotificationSettingsResponse } from '../mappers/settings.mapper';
import { UserNotificationPreferences } from '../models/notification.model';
import { MasterSettings } from '../models/settings.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

/**
 * Ajustes que el backend expone por cliente.
 *
 * Ambos endpoints piden `idClient`, así que el servicio lo resuelve del
 * documento de la identidad de Auth0 y las pantallas no tienen que plumbearlo.
 * `viewmaster` además exige rol ADMIN, igual que la tarjeta que lleva a él.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiSettingsService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly baseUrl = `${environment.api.baseUrl}/settings`;

  getNotificationSettings(): Observable<UserNotificationPreferences> {
    return this.fetch('viewnotifications').pipe(map((response) => mapNotificationSettingsResponse(response)));
  }

  getMasterSettings(): Observable<MasterSettings> {
    return this.fetch('viewmaster').pipe(map((response) => mapMasterSettingsResponse(response)));
  }

  private fetch(path: string): Observable<unknown> {
    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(`${this.baseUrl}/${path}`, {
          params: new HttpParams().set('idClient', identity.document ?? ''),
        }),
      ),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
