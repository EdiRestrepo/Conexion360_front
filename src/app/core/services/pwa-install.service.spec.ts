import { TestBed } from '@angular/core/testing';

import { PwaInstallService } from './pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  it('does not offer installing until the browser allows it', async () => {
    expect(service.canInstall()).toBeFalse();
    expect(await service.install()).toBe('unavailable');
  });

  it('keeps the browser prompt and shows it on demand', async () => {
    const event = createPromptEvent('accepted');
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(service.canInstall()).toBeTrue();

    expect(await service.install()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a prompt the user already dismissed', async () => {
    window.dispatchEvent(createPromptEvent('dismissed'));

    expect(await service.install()).toBe('dismissed');
    expect(service.canInstall()).toBeFalse();
  });

  it('stops offering the option once the app is installed', () => {
    window.dispatchEvent(createPromptEvent('accepted'));
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.canInstall()).toBeFalse();
  });

  function createPromptEvent(outcome: 'accepted' | 'dismissed'): Event & { prompt: jasmine.Spy } {
    const event = new Event('beforeinstallprompt', { cancelable: true });

    return Object.assign(event, {
      prompt: jasmine.createSpy('prompt').and.resolveTo(),
      userChoice: Promise.resolve({ outcome, platform: 'web' }),
    });
  }
});
