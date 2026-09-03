import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, catchError, defaultIfEmpty, filter, map, of, shareReplay, switchMap, take, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationDataSource } from '../contracts/notification-data-source';
import { mapNotificationsResponse, mapRealtimeNotification } from '../mappers/notifications.mapper';
import { Notification } from '../models/notification.model';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';
import { NotificationsHubService } from './notifications-hub.service';

@Injectable({
  providedIn: 'root',
})
export class ApiNotificationsService implements NotificationDataSource {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly hub = inject(NotificationsHubService);
  private readonly notificationsUrl = `${environment.api.baseUrl}/notifications/allnotifications`;
  private readonly readNotificationUrl = `${environment.api.baseUrl}/notifications/readnotification`;

  /**
   * Copia local de la bandeja. Es la fuente tanto de la lista como del contador
   * del badge, así que un aviso del Hub o un "marcar como leída" se reflejan en
   * ambos a la vez.
   */
  private readonly notifications$ = new BehaviorSubject<Notification[]>([]);
  /**
   * Ids marcados como leídos en esta sesión. El backend ya persiste el cambio
   * (`PATCH /notifications/readnotification/{idClient}/{idNotification}`), pero
   * se reaplican después de cada consulta para cubrir la ventana en que una
   * respuesta ya en vuelo traería el estado anterior.
   */
  private readonly locallyRead = new Set<string>();
  private request$: Observable<Notification[]> | null = null;

  constructor() {
    this.hub.notificationReceived$.subscribe((payload) => this.onRealtimeNotification(payload));
  }

  getAll(): Observable<Notification[]> {
    return this.load().pipe(switchMap(() => this.notifications$));
  }

  getUnreadCount(): Observable<number> {
    return this.getAll().pipe(map((notifications) => notifications.filter((notification) => !notification.read).length));
  }

  reload(): void {
    this.request$ = null;
  }

  /**
   * Agrega al principio de la bandeja la notificación que anunció el Hub, sin
   * volver a pedir la lista completa: lo que se quiere ver es *llegar* una
   * notificación. La lista y el badge la reflejan de inmediato.
   */
  private onRealtimeNotification(payload: unknown): void {
    const notification = mapRealtimeNotification(payload);

    this.notifications$.next([notification, ...this.notifications$.value]);
  }

  /**
   * Marca la notificación como leída en la bandeja y avisa al backend.
   *
   * El cambio se pinta antes de la petición para que la tarjeta y el badge
   * respondan al click. Un fallo del `PATCH` no lo revierte: hoy el endpoint
   * responde 500 y, aun cuando responde bien, no persiste nada (su acción arma
   * el DTO y devuelve `NoContent`), así que lo leído sigue viviendo en
   * `locallyRead` hasta que el backend lo guarde de verdad. Revertir solo haría
   * que la tarjeta volviera a "no leída" delante del usuario.
   */
  markAsRead(id: string): Observable<Notification | null> {
    const target = this.notifications$.value.find((notification) => notification.id === id) ?? null;

    if (!target || target.read) {
      return of(target);
    }

    const updated: Notification = { ...target, read: true };
    this.setRead(id);

    // Los avisos del Hub y los que llegaron sin id llevan uno inventado por el
    // mapper, que el backend no reconoce: se marcan solo en la copia local.
    if (!isBackendId(id)) {
      return of(updated);
    }

    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.patch<void>(`${this.readNotificationUrl}/${encodeURIComponent(identity.document ?? '')}/${id}`, null),
      ),
      catchError(() => EMPTY),
      map(() => updated),
      defaultIfEmpty(updated),
    );
  }

  private setRead(id: string): void {
    this.locallyRead.add(id);

    this.notifications$.next(
      this.notifications$.value.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  }

  /**
   * Una sola petición compartida entre la bandeja y los contadores del badge
   * (barra lateral, menú de usuario y navegación móvil los piden a la vez). Si
   * falla se descarta, para que "Reintentar" vuelva a consultar de verdad.
   */
  private load(): Observable<Notification[]> {
    this.request$ ??= this.getIdentity().pipe(
      tap((identity) => void this.hub.connect(identity.document ?? '')),
      switchMap((identity) => this.fetch(identity)),
      tap((notifications) => this.notifications$.next(notifications)),
      catchError((error: unknown) => {
        this.request$ = null;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.request$;
  }

  private fetch(identity: Auth0Identity): Observable<Notification[]> {
    return this.http
      .get<unknown>(this.notificationsUrl, { params: new HttpParams().set('idClient', identity.document ?? '') })
      .pipe(map((response) => this.applyLocalReads(mapNotificationsResponse(response))));
  }

  private applyLocalReads(notifications: Notification[]): Notification[] {
    if (this.locallyRead.size === 0) {
      return notifications;
    }

    return notifications.map((notification) =>
      this.locallyRead.has(notification.id) ? { ...notification, read: true } : notification,
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}

/**
 * `idNotification` es un entero en el backend. Cualquier otro formato viene de
 * un id inventado por el mapper (`realtime-1`, `notification-2`).
 */
function isBackendId(id: string): boolean {
  return /^\d+$/.test(id);
}
