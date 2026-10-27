import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  describe('with the service worker enabled', () => {
    let versionUpdates: Subject<VersionEvent>;
    let unrecoverable: Subject<UnrecoverableStateEvent>;
    let checkForUpdate: jasmine.Spy<() => Promise<boolean>>;
    let service: PwaUpdateService;

    beforeEach(() => {
      versionUpdates = new Subject<VersionEvent>();
      unrecoverable = new Subject<UnrecoverableStateEvent>();
      checkForUpdate = jasmine.createSpy('checkForUpdate').and.resolveTo(false);

      TestBed.configureTestingModule({
        providers: [
          {
            provide: SwUpdate,
            useValue: { isEnabled: true, versionUpdates, unrecoverable, checkForUpdate },
          },
        ],
      });
      service = TestBed.inject(PwaUpdateService);
    });

    it('notifies only when a new version is ready to use', () => {
      const ready = jasmine.createSpy('ready');
      service.updateReady$.subscribe(ready);

      versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
      expect(ready).not.toHaveBeenCalled();

      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'a' },
        latestVersion: { hash: 'b' },
      });
      expect(ready).toHaveBeenCalledTimes(1);
    });

    it('notifies when the cache can no longer serve the app', () => {
      const broken = jasmine.createSpy('broken');
      service.unrecoverable$.subscribe(broken);

      unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing files' });

      expect(broken).toHaveBeenCalledTimes(1);
    });

    it('checks for a new version when the user comes back to the app', () => {
      spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
      const subscription = service.checksOnReturn$.subscribe();

      document.dispatchEvent(new Event('visibilitychange'));
      // Volver varias veces seguidas no repite la consulta.
      document.dispatchEvent(new Event('visibilitychange'));

      expect(checkForUpdate).toHaveBeenCalledTimes(1);
      subscription.unsubscribe();
    });

    it('does not check while the app is hidden', () => {
      spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
      const subscription = service.checksOnReturn$.subscribe();

      document.dispatchEvent(new Event('visibilitychange'));

      expect(checkForUpdate).not.toHaveBeenCalled();
      subscription.unsubscribe();
    });
  });

  it('stays silent when there is no service worker (development and tests)', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PwaUpdateService);
    const complete = jasmine.createSpy('complete');

    service.updateReady$.subscribe({ complete });
    service.unrecoverable$.subscribe({ complete });
    service.checksOnReturn$.subscribe({ complete });

    expect(complete).toHaveBeenCalledTimes(3);
  });
});
