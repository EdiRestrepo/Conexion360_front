import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, filter, map, of, switchMap, take, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  mapMasterSettingsResponse,
  mapNotificationSettingsRequest,
  mapNotificationSettingsResponse,
} from '../mappers/settings.mapper';
import {
  NotificationSettings,
  UserNotificationPreferences,
  defaultNotificationPreferences,
} from '../models/notification.model';
import { MasterSettings } from '../models/settings.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

/**
 * Ajustes que el backend expone por cliente.
 *
 * Los endpoints de lectura piden `idClient` y los de escritura lo llevan en el
 * cuerpo, así que el servicio lo resuelve del documento de la identidad de
 * Auth0 y las pantallas no tienen que plumbearlo. `viewmaster` además exige rol
 * ADMIN, igual que la tarjeta que lleva a él.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiSettingsService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly baseUrl = `${environment.api.baseUrl}/settings`;

  getNotificationSettings(): Observable<NotificationSettings> {
    return this.fetch('viewnotifications').pipe(
      map((response) => mapNotificationSettingsResponse(response)),
      // Un 404 es "este cliente todavía no guardó nada", que es justo el caso
      // para el que existe `createnotifications`: se responde con los valores
      // por defecto y los ids en 0 para que la pantalla pueda crearlos, en vez
      // de dejarla en error sin salida. Cualquier otro fallo sí se propaga.
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of({ channelId: 0, eventId: 0, preferences: { ...defaultNotificationPreferences } })
          : throwError(() => error),
      ),
    );
  }

  /**
   * Guarda las preferencias con el endpoint que corresponda: el backend separa
   * el alta de la edición en dos verbos, y solo acepta `createnotifications`
   * una vez por cliente.
   *
   * Los ids que trajo `viewnotifications` son el criterio: si están en 0 el
   * cliente nunca guardó configuración y hay que crearla. Tras crearla, quien
   * llame debe releer los ajustes para quedarse con los ids reales, o el
   * siguiente guardado volvería a crear.
   */
  saveNotificationSettings(
    preferences: UserNotificationPreferences,
    settings: Pick<NotificationSettings, 'channelId' | 'eventId'>,
  ): Observable<void> {
    const alreadyExists = settings.channelId > 0 || settings.eventId > 0;

    return this.getIdentity().pipe(
      switchMap((identity) => {
        const body = mapNotificationSettingsRequest(preferences, identity.document ?? '', settings);

        return alreadyExists
          ? this.http.patch<void>(`${this.baseUrl}/updatenotifications`, body)
          : this.http.post<void>(`${this.baseUrl}/createnotifications`, body);
      }),
    );
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
