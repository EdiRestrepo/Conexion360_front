import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { EMPTY, Observable, catchError, filter, from, fromEvent, map, switchMap, throttleTime } from 'rxjs';

/** Una app instalada puede quedar abierta días; no se pregunta más seguido. */
export const UPDATE_CHECK_THROTTLE_MS = 30 * 60 * 1000;

/**
 * Detecta despliegues nuevos para que el usuario no se quede en la versión
 * vieja: el service worker sirve la app desde su caché y, sin este aviso, la
 * versión nueva solo entraría al cerrar todas las pestañas o ventanas.
 *
 * No muestra nada: expone eventos y el shell decide cómo avisar. `SwUpdate` se
 * inyecta opcional porque en desarrollo y en las pruebas no hay service worker.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly document = inject(DOCUMENT);
  private readonly swUpdate = this.enabledSwUpdate();

  /** Hay una versión nueva descargada y lista para usar tras recargar. */
  readonly updateReady$: Observable<void> = this.swUpdate
    ? this.swUpdate.versionUpdates.pipe(
        filter((event) => event.type === 'VERSION_READY'),
        map(() => undefined),
      )
    : EMPTY;

  /**
   * La caché quedó inconsistente con el servidor (p. ej. el navegador borró
   * parte de ella): la única salida es recargar.
   */
  readonly unrecoverable$: Observable<void> = this.swUpdate
    ? this.swUpdate.unrecoverable.pipe(map(() => undefined))
    : EMPTY;

  /**
   * Al volver a la app (cambio de pestaña o de aplicación en el celular) se
   * pregunta por una versión nueva. El resultado llega por `updateReady$`.
   */
  readonly checksOnReturn$: Observable<void> = this.swUpdate
    ? this.watchVisibility(this.swUpdate)
    : EMPTY;

  reload(): void {
    this.document.location.reload();
  }

  private watchVisibility(swUpdate: SwUpdate): Observable<void> {
    return fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.document.visibilityState === 'visible'),
      throttleTime(UPDATE_CHECK_THROTTLE_MS),
      switchMap(() => from(swUpdate.checkForUpdate()).pipe(catchError(() => EMPTY))),
      map(() => undefined),
    );
  }

  private enabledSwUpdate(): SwUpdate | null {
    const swUpdate = inject(SwUpdate, { optional: true });
    return swUpdate?.isEnabled ? swUpdate : null;
  }
}
