import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0Identity } from '../models/user.model';
import { Auth0FacadeService } from './auth0-facade.service';

/**
 * Mensajes copiados de los que el propio backend usa como semilla
 * (`Connection360.Application.dll`), para que la notificación simulada se lea
 * igual que las reales.
 */
const sampleMessages = [
  'Se confirma recolección de la carga, inicia tránsito internacional.',
  'Se inicia proceso de nacionalización en aduana de origen.',
  'Su pedido es demasiado pesado según indicaciones',
  'El envío llegó a la aduana de destino para trámite de importación.',
  'En el momento presentamos muchas demoras y su pedido puede tardar más tiempo',
  'El envío fue entregado satisfactoriamente al destinatario final.',
];

/**
 * TEMPORAL. Dispara `GET /notifications/generatenotifications`, que crea una
 * notificación en el backend y la anuncia por el Hub.
 *
 * No agrega nada a la bandeja por su cuenta: la nueva llega por SignalR, igual
 * que llegaría una real. Así el botón es una prueba de extremo a extremo del
 * tiempo real y no una simulación de mentira.
 *
 * Cuando el backend genere notificaciones por eventos logísticos reales, se
 * borra este archivo y el botón "Simular notificación" de `features/notifications/`.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationsSimulatorService {
  private readonly http = inject(HttpClient);
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly generateUrl = `${environment.api.baseUrl}/notifications/generatenotifications`;
  private nextMessage = 0;

  /** Encadena los mensajes de ejemplo para que cada clic traiga uno distinto. */
  generate(): Observable<void> {
    const message = sampleMessages[this.nextMessage % sampleMessages.length];
    this.nextMessage++;

    return this.getIdentity().pipe(
      switchMap((identity) =>
        this.http.get<unknown>(this.generateUrl, {
          params: new HttpParams().set('idClient', identity.document ?? '').set('Message', message),
        }),
      ),
      map(() => undefined),
    );
  }

  private getIdentity(): Observable<Auth0Identity> {
    return this.auth0Facade.user$.pipe(
      filter((identity): identity is Auth0Identity => Boolean(identity)),
      take(1),
    );
  }
}
