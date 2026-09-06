import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';
import { clearLastActivity, writeLastActivity } from '../utils/idle-activity';
import { IdlePhase, IdleSessionService } from './idle-session.service';

const lastActivityKey = 'c360.last-activity';
const idleTimeoutMs = environment.session.idleTimeoutMinutes * 60_000;
const warningStartMs = idleTimeoutMs - environment.session.warningSeconds * 1000;

describe('IdleSessionService', () => {
  let service: IdleSessionService;
  let phases: IdlePhase[];
  let subscription: Subscription;

  beforeEach(() => {
    localStorage.removeItem(lastActivityKey);
    clearLastActivity();

    TestBed.configureTestingModule({});
    service = TestBed.inject(IdleSessionService);

    phases = [];
    subscription = service.phase$.subscribe((phase) => phases.push(phase));
  });

  afterEach(() => {
    subscription.unsubscribe();
    service.stop();
    localStorage.removeItem(lastActivityKey);
    clearLastActivity();
  });

  it('avisa antes de cerrar y cierra al cumplirse el tiempo', fakeAsync(() => {
    service.start();

    tick(warningStartMs);

    expect(phases).toEqual(['active', 'warning']);
    expect(service.remainingSeconds()).toBe(environment.session.warningSeconds);

    tick(environment.session.warningSeconds * 1000);

    expect(phases).toEqual(['active', 'warning', 'expired']);
  }));

  it('la actividad del usuario pospone el aviso', fakeAsync(() => {
    service.start();

    // A mitad de camino del aviso, para no depender del valor configurado.
    const halfway = Math.floor(warningStartMs / 2);

    tick(halfway);
    document.dispatchEvent(new Event('mousemove'));

    // Sin la actividad ya estaríamos avisando; con ella el reloj vuelve a cero.
    tick(warningStartMs - halfway);

    expect(phases).toEqual(['active']);

    service.stop();
  }));

  it('ignora la actividad mientras el aviso está abierto: solo un acto explícito renueva', fakeAsync(() => {
    service.start();
    tick(warningStartMs);

    expect(phases).toEqual(['active', 'warning']);

    // El diálogo es modal, pero el ratón sobre el fondo sigue llegando a
    // `document`: si esto renovara la sesión, el cierre no ocurriría nunca.
    document.dispatchEvent(new Event('mousemove'));
    tick(2000);

    expect(phases).toEqual(['active', 'warning']);

    tick(environment.session.warningSeconds * 1000);

    expect(phases).toEqual(['active', 'warning', 'expired']);
  }));

  it('«Seguir conectado» devuelve la sesión a activa de inmediato', fakeAsync(() => {
    service.start();
    tick(warningStartMs);

    expect(phases).toEqual(['active', 'warning']);

    service.keepAlive();

    expect(phases).toEqual(['active', 'warning', 'active']);

    service.stop();
  }));

  it('usa reloj de pared: un salto de tiempo cierra la sesión en el primer tick', fakeAsync(() => {
    service.start();

    // Equivale a que la pestaña estuviera dormida o el equipo suspendido: el
    // ticker no acumuló ciclos, pero el tiempo real transcurrió igual.
    writeLastActivity(Date.now() - (idleTimeoutMs + 60_000));
    tick(1000);

    expect(phases).toEqual(['active', 'expired']);
  }));

  it('la actividad de otra pestaña cierra el aviso de esta', fakeAsync(() => {
    service.start();
    tick(warningStartMs);

    expect(phases).toEqual(['active', 'warning']);

    // La pestaña hermana escribe la marca compartida; aquí solo se poll-ea.
    localStorage.setItem(lastActivityKey, String(Date.now()));
    tick(1000);

    expect(phases).toEqual(['active', 'warning', 'active']);

    service.stop();
  }));

  it('no expulsa al usuario cuando la marca desaparece', fakeAsync(() => {
    service.start();

    localStorage.removeItem(lastActivityKey);
    clearLastActivity();
    tick(1000);

    expect(phases).toEqual(['active']);
    expect(localStorage.getItem(lastActivityKey)).not.toBeNull();

    service.stop();
  }));

  it('sigue funcionando con el almacenamiento bloqueado', fakeAsync(() => {
    spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError');
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');

    expect(() => service.start()).not.toThrow();

    tick(warningStartMs);

    expect(phases).toEqual(['active', 'warning']);

    tick(environment.session.warningSeconds * 1000);

    expect(phases).toEqual(['active', 'warning', 'expired']);
  }));

  it('start() es idempotente: no deja un segundo ticker suelto', fakeAsync(() => {
    service.start();
    service.start();
    service.stop();

    // Un ticker duplicado seguiría evaluando tras el `stop()` y acabaría
    // emitiendo `expired` (además de dejar temporizadores pendientes).
    tick(idleTimeoutMs + 2000);

    expect(phases).toEqual(['active']);
  }));
});
