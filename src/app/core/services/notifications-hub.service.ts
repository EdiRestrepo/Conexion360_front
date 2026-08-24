import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth0FacadeService } from './auth0-facade.service';

/**
 * Método que el Hub invoca en los clientes.
 *
 * Verificado en `Connection360.Infrastructure.dll`
 * (`SignalRNotifierService.SendNotificationToUserAsync` → `SendAsync("ReceiveNotification", ...)`).
 * Si el backend lo renombra, aquí deja de llegar todo, en silencio.
 */
const receiveNotificationMethod = 'ReceiveNotification';

export type RealtimeState = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root',
})
export class NotificationsHubService {
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly notificationReceived = new Subject<unknown>();
  private readonly state = new BehaviorSubject<RealtimeState>('disconnected');
  private readonly receivedCount = new BehaviorSubject<number>(0);
  private connection: HubConnection | null = null;

  /**
   * Emite el objeto que manda el Hub con cada notificación nueva. El backend
   * envía un anónimo `{ message, data, timestamp }`; interpretarlo es tarea de
   * `mapRealtimeNotification`.
   */
  readonly notificationReceived$: Observable<unknown> = this.notificationReceived.asObservable();
  readonly state$: Observable<RealtimeState> = this.state.asObservable();

  /**
   * Cuántos avisos ha entregado el Hub en esta sesión. Sirve para distinguir de
   * un vistazo si un push no llegó (el contador no sube) o si llegó y la bandeja
   * lo descartó (sube pero no aparece la tarjeta).
   */
  readonly receivedCount$: Observable<number> = this.receivedCount.asObservable();

  /**
   * Abre la suscripción del cliente al Hub. Es idempotente: llamarla dos veces
   * no crea una segunda conexión.
   */
  async connect(idClient: string): Promise<void> {
    if (this.connection) {
      return;
    }

    this.state.next('connecting');
    // El Hub valida JWT, pero SignalR no pasa por `HttpClient` y el interceptor
    // de Auth0 no lo alcanza: el backend lee el token del query `access_token`,
    // que es justo lo que hace `accessTokenFactory`.
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.api.baseUrl}/hubs/notifications?idClient=${encodeURIComponent(idClient)}`, {
        accessTokenFactory: () => firstValueFrom(this.auth0Facade.getAccessToken()),
      })
      .withAutomaticReconnect()
      .configureLogging(environment.production ? LogLevel.Error : LogLevel.Warning)
      .build();

    // Se reciben todos los argumentos: el backend puede invocar el método con
    // un único objeto o con varios parámetros sueltos.
    connection.on(receiveNotificationMethod, (...args: unknown[]) => {
      if (!environment.production) {
        // Deja ver la forma real del aviso mientras se termina de definir en el
        // backend.
        console.debug('[SignalR] ReceiveNotification', args);
      }

      this.receivedCount.next(this.receivedCount.value + 1);
      this.notificationReceived.next(args);
    });
    connection.onreconnecting(() => this.state.next('connecting'));
    connection.onreconnected(() => this.state.next('connected'));
    connection.onclose(() => this.state.next('disconnected'));

    this.connection = connection;

    try {
      await connection.start();
      this.state.next('connected');
    } catch {
      // Sin tiempo real la aplicación sigue funcionando: la bandeja se consulta
      // igual por HTTP. Se libera la conexión para poder reintentar más tarde.
      this.connection = null;
      this.state.next('disconnected');
    }
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;

    if (!connection || connection.state === HubConnectionState.Disconnected) {
      this.connection = null;
      this.state.next('disconnected');
      return;
    }

    this.connection = null;
    await connection.stop();
    this.state.next('disconnected');
  }
}
