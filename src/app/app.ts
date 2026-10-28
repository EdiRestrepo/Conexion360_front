import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';

import { PwaInstallService } from './core/services/pwa-install.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'Conexión360';

  private readonly pwaUpdate = inject(PwaUpdateService);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    // Se instancia aquí, y no donde se usa, para no perder `beforeinstallprompt`
    // (ver `PwaInstallService`).
    inject(PwaInstallService);

    // Las actualizaciones se avisan en toda la app, no solo bajo `MainLayout`:
    // la versión vieja también puede estar sirviendo la pantalla de error de
    // sesión o el callback de Auth0.
    this.pwaUpdate.checksOnReturn$.pipe(takeUntilDestroyed()).subscribe();
    this.pwaUpdate.updateReady$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.offerReload('Hay una nueva versión de Conexión360.', 'Actualizar'));
    this.pwaUpdate.unrecoverable$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.offerReload('La aplicación necesita recargarse para seguir funcionando.', 'Recargar'));
  }

  /**
   * No recarga sola: el usuario podría estar a mitad de un formulario. El aviso
   * queda abierto hasta que decida.
   */
  private offerReload(message: string, action: string): void {
    this.snackBar
      .open(message, action)
      .onAction()
      .subscribe(() => this.pwaUpdate.reload());
  }
}
