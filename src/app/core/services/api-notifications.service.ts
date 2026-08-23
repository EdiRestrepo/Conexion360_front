import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, map, of, shareReplay, switchMap, take, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationDataSource } from '../contracts/notification-data-source';
import { mapNotificationsResponse } from '../mappers/notifications.mapper';
import { Notification } from '../models/notification.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ApiNotificationsService implements NotificationDataSource {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly notificationsUrl = `${environment.api.baseUrl}/notifications/allnotifications`;

  /**
   * Copia local de la bandeja. Es la fuente de la lista y del contador del
   * badge, así que marcar una notificación como leída se refleja en ambos sin
   * volver a consultar el backend —que además todavía no persiste ese cambio.
   */
  private readonly notifications$ = new BehaviorSubject<Notification[]>([]);
  private request$: Observable<Notification[]> | null = null;

  getAll(): Observable<Notification[]> {
    return this.load().pipe(switchMap(() => this.notifications$));
  }

  getUnreadCount(): Observable<number> {
    return this.getAll().pipe(map((notifications) => notifications.filter((notification) => !notification.read).length));
  }

  reload(): void {
    this.request$ = null;
  }

  markAsRead(id: string): Observable<Notification | null> {
    const notifications = this.notifications$.value;
    const target = notifications.find((notification) => notification.id === id) ?? null;

    if (!target || target.read) {
      return of(target);
    }

    const updated: Notification = { ...target, read: true };
    // TODO(backend): falta el endpoint que persista el cambio de estado. Hasta
    // entonces lo leído se pierde al recargar la página.
    this.notifications$.next(notifications.map((notification) => (notification.id === id ? updated : notification)));

    return of(updated);
  }

  /**
   * Una sola petición compartida entre la bandeja y los contadores del badge
   * (barra lateral, menú de usuario y navegación móvil los piden a la vez). Si
   * falla se descarta, para que "Reintentar" vuelva a consultar de verdad.
   */
  private load(): Observable<Notification[]> {
    this.request$ ??= this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.notificationsUrl, {
          params: new HttpParams().set('idClient', identity.document ?? ''),
        }),
      ),
      map((response) => mapNotificationsResponse(response)),
      tap((notifications) => this.notifications$.next(notifications)),
      catchError((error: unknown) => {
        this.request$ = null;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.request$;
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
