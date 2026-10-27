import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/**
 * Evento de Chrome, Edge y Android; no está en `lib.dom` porque no es estándar.
 * Safari y Firefox no lo emiten.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'manual' | 'unavailable';

/**
 * Ofrece "Instalar aplicación" solo cuando el navegador lo permite.
 *
 * `beforeinstallprompt` se dispara una sola vez, poco después de cargar la
 * página. Por eso el servicio lo instancia el componente raíz al arrancar: si
 * esperara a que se abra el menú de usuario, el evento ya habría pasado.
 *
 * En iOS no existe ese evento: hay que instalar a mano desde Safari
 * (Compartir → Agregar a pantalla de inicio). `install()` devuelve `'manual'`
 * para que la interfaz lo explique.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(this.detectStandalone());
  private readonly ios = this.detectIos();

  /** Hay alguna forma de instalar la app desde aquí. */
  readonly canInstall = computed(
    () => !this.installed() && (this.deferredPrompt() !== null || this.ios),
  );

  constructor() {
    const win = this.window;

    if (!win) {
      return;
    }

    const onPrompt = (event: Event): void => {
      // Sin esto Chrome muestra su propia mini barra; se prefiere ofrecerlo en
      // el menú de usuario, donde no tapa la navegación inferior del celular.
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      this.installed.set(true);
      this.deferredPrompt.set(null);
    };

    win.addEventListener('beforeinstallprompt', onPrompt);
    win.addEventListener('appinstalled', onInstalled);
    inject(DestroyRef).onDestroy(() => {
      win.removeEventListener('beforeinstallprompt', onPrompt);
      win.removeEventListener('appinstalled', onInstalled);
    });
  }

  async install(): Promise<PwaInstallOutcome> {
    const prompt = this.deferredPrompt();

    if (!prompt) {
      return this.canInstall() ? 'manual' : 'unavailable';
    }

    // El navegador solo deja usar cada evento una vez, se acepte o no.
    this.deferredPrompt.set(null);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    return outcome;
  }

  private detectStandalone(): boolean {
    const win = this.window;

    if (!win) {
      return false;
    }

    const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return iosStandalone || (win.matchMedia?.('(display-mode: standalone)').matches ?? false);
  }

  private detectIos(): boolean {
    const navigator = this.window?.navigator;

    if (!navigator) {
      return false;
    }

    // iPadOS se presenta como Mac de escritorio; lo delata la pantalla táctil.
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
}
