import { DestroyRef, Injectable, NgZone, Signal, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';

import { environment } from '../../../environments/environment';
import { readLastActivity, writeLastActivity } from '../utils/idle-activity';

export type IdlePhase = 'active' | 'warning' | 'expired';

const idleTimeoutMs = environment.session.idleTimeoutMinutes * 60_000;

/**
 * Instante (medido en inactividad acumulada) en el que aparece el aviso. Si se
 * configura un `warningSeconds` mayor o igual que el propio timeout, queda en 0
 * y el aviso saldría siempre: es una configuración inválida, no un caso a
 * soportar.
 */
const warningStartMs = Math.max(0, idleTimeoutMs - environment.session.warningSeconds * 1000);

const tickIntervalMs = 1000;

/** Evita escribir en `localStorage` en cada `mousemove`. */
const writeThrottleMs = 2000;

/**
 * Eventos que cuentan como actividad. Son todos de intención explícita del
 * usuario: nada de `visibilitychange` ni de tráfico de fondo (SignalR, sondeos,
 * animaciones), que mantendrían viva una sesión abandonada.
 */
const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

/**
 * Cierre de sesión por inactividad del usuario.
 *
 * Auth0 no puede resolver esto por su cuenta: sus temporizadores viven en el
 * proveedor de identidad (cookie SSO y caducidad del refresh token) y no ven si
 * alguien mueve el ratón dentro de la aplicación. El único proceso que observa
 * esa actividad es el navegador, así que la detección vive aquí.
 *
 * Dos decisiones sostienen el diseño:
 *
 * 1. **Reloj de pared, no un `setTimeout` al timeout completo.** Un ticker de un
 *    segundo compara `Date.now()` contra la última actividad. Es lo único que
 *    aguanta el throttling de las pestañas en segundo plano (Chrome baja a
 *    ~1 tick/minuto) y la suspensión del equipo: al despertar, el tiempo
 *    transcurrido es real y la sesión caduca como debe.
 * 2. **Marca compartida en `localStorage`** (ver `idle-activity.ts`): la
 *    actividad en cualquier pestaña mantiene viva la sesión de todas, y el
 *    "Seguir conectado" de una cierra el aviso de las hermanas en el siguiente
 *    tick, sin mensajería entre pestañas.
 *
 * Los listeners y el ticker corren fuera de la zona de Angular: durante toda
 * la fase `active` no se dispara un solo ciclo de detección de cambios. Solo se
 * reentra en la zona al cambiar de fase y, durante el aviso, una vez por
 * segundo para refrescar la cuenta atrás.
 */
@Injectable({
  providedIn: 'root',
})
export class IdleSessionService {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly phase = new BehaviorSubject<IdlePhase>('active');
  private readonly remaining = signal(environment.session.warningSeconds);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastWriteMs = 0;

  /**
   * `distinctUntilChanged` es lo que garantiza una sola apertura del aviso por
   * episodio: los segundos que cambian cada tick viajan por `remainingSeconds`,
   * no por aquí.
   */
  readonly phase$: Observable<IdlePhase> = this.phase.pipe(distinctUntilChanged());

  /** Solo es significativo mientras la fase es `warning`. */
  readonly remainingSeconds: Signal<number> = this.remaining.asReadonly();

  constructor() {
    // El inyector raíz se destruye entre specs (`TestBed.resetTestingModule`):
    // sin esto, un ticker olvidado sobreviviría al resto de la suite.
    this.destroyRef.onDestroy(() => this.stop());
  }

  private readonly onActivity = (): void => {
    // Congelado durante el aviso: el diálogo es modal, pero un `mousemove`
    // sobre el fondo o un tabulador seguirían llegando a `document` y
    // renovarían la sesión sola, de modo que el cierre no ocurriría nunca.
    // Durante el aviso solo `keepAlive()` renueva.
    if (this.phase.value !== 'active') {
      return;
    }

    const now = Date.now();

    if (now - this.lastWriteMs < writeThrottleMs) {
      return;
    }

    this.lastWriteMs = now;
    writeLastActivity(now);
  };

  /**
   * Volver a la pestaña no cuenta como actividad —quien vuelve pasado el
   * tiempo de inactividad debe encontrarse la sesión cerrada—, pero sí obliga a
   * reevaluar: el ticker venía throttled y el estado en pantalla podría estar
   * atrasado hasta un minuto.
   */
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.evaluate();
    }
  };

  /** Idempotente: `MainLayout` puede montarse varias veces en una sesión. */
  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    // Solo se siembra si falta o es inválida. Reescribir siempre convertiría un
    // F5 en actividad y permitiría revivir una sesión ya vencida; la marca de
    // una sesión nueva nace en el callback de Auth0 (ver `main.ts`).
    const last = readLastActivity();

    if (last === null || last > Date.now()) {
      writeLastActivity(Date.now());
    }

    this.phase.next('active');

    this.zone.runOutsideAngular(() => {
      for (const event of activityEvents) {
        // `capture: true` no es opcional para `scroll`: no burbujea desde los
        // contenedores internos, así que sin captura leer una tabla larga no
        // contaría como actividad.
        document.addEventListener(event, this.onActivity, { passive: true, capture: true });
      }

      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.intervalId = setInterval(() => this.evaluate(), tickIntervalMs);
    });
  }

  /** "Seguir conectado": la única forma de renovar mientras el aviso está abierto. */
  keepAlive(): void {
    const now = Date.now();

    this.lastWriteMs = now;
    writeLastActivity(now);
    this.evaluate();
  }

  /**
   * Detiene el ticker y los listeners de esta pestaña. No toca el
   * almacenamiento: la marca es compartida y borrarla desde una pestaña que se
   * cierra afectaría a las hermanas.
   */
  stop(): void {
    if (this.intervalId === null) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;

    for (const event of activityEvents) {
      document.removeEventListener(event, this.onActivity, { capture: true });
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private evaluate(): void {
    const now = Date.now();
    const last = readLastActivity();

    // Sin marca utilizable (otra pestaña hizo logout y la limpió, o el reloj
    // del sistema saltó hacia atrás) se reescribe en vez de cerrar sesión:
    // expulsar por un dato ausente sería un falso positivo. Si la sesión de
    // Auth0 murió de verdad, el primer 401 lo revelará.
    if (last === null || last > now) {
      writeLastActivity(now);
      this.emit('active', environment.session.warningSeconds);
      return;
    }

    const idleMs = now - last;
    const nextPhase: IdlePhase = idleMs >= idleTimeoutMs ? 'expired' : idleMs >= warningStartMs ? 'warning' : 'active';
    const remainingSeconds = Math.max(0, Math.ceil((idleTimeoutMs - idleMs) / 1000));

    this.emit(nextPhase, remainingSeconds);

    // Una sola emisión de `expired`: si el ticker siguiera vivo dispararía un
    // logout por segundo mientras el navegador redirige a Auth0.
    if (nextPhase === 'expired') {
      this.stop();
    }
  }

  private emit(nextPhase: IdlePhase, remainingSeconds: number): void {
    if (nextPhase !== this.phase.value) {
      this.zone.run(() => {
        this.remaining.set(remainingSeconds);
        this.phase.next(nextPhase);
      });
      return;
    }

    // Dentro del aviso la cuenta atrás es visible, así que ahí sí hace falta un
    // ciclo de detección de cambios por segundo (y solo durante el aviso).
    if (nextPhase === 'warning' && remainingSeconds !== this.remaining()) {
      this.zone.run(() => this.remaining.set(remainingSeconds));
    }
  }
}
