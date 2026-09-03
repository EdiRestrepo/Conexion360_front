import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith } from 'rxjs';

import { MasterSettings } from '../../../core/models/settings.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import type { MasterSettingsViewModel } from '../models/settings-view.model';

/** Opciones que ofrece la pantalla; el valor que mande el backend se agrega si no está. */
const currencyOptions = ['USD - Dólar', 'COP - Peso colombiano'];
const languageOptions = ['Español'];
const timeZoneOptions = ['America/Bogota (UTC-5)'];

const loadingViewModel: MasterSettingsViewModel = {
  state: 'loading',
  settings: null,
  currencies: currencyOptions,
  languages: languageOptions,
  timeZones: timeZoneOptions,
};

@Component({
  selector: 'app-settings-master-data',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './settings-master-data.html',
  styleUrl: './settings-master-data.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMasterData {
  private readonly settingsService = inject(ApiSettingsService);

  protected readonly saveMessage = signal<string | null>(null);

  protected readonly viewModel$: Observable<MasterSettingsViewModel> = this.settingsService.getMasterSettings().pipe(
    map((settings) => this.createViewModel(settings)),
    startWith(loadingViewModel),
    catchError(() =>
      of({
        ...loadingViewModel,
        state: 'error',
        message: 'No fue posible cargar la configuración maestra.',
      } satisfies MasterSettingsViewModel),
    ),
  );

  protected saveConfiguration(): void {
    // `viewmaster` solo expone la lectura: no hay endpoint que reciba estos
    // valores, así que decir "guardado" haría creer que el cambio viajó.
    this.saveMessage.set('Los ajustes maestros son de solo lectura: el backend todavía no expone un endpoint para guardarlos.');
  }

  private createViewModel(settings: MasterSettings): MasterSettingsViewModel {
    return {
      state: 'success',
      settings,
      currencies: withCurrentValue(currencyOptions, settings.currency),
      languages: withCurrentValue(languageOptions, settings.language),
      timeZones: withCurrentValue(timeZoneOptions, settings.timeZone),
    };
  }
}

/**
 * El backend escribe algunos valores distinto a la lista fija (`America/Bogota(UTC-5)`
 * sin espacio, por ejemplo). Antes que normalizarlos y arriesgar mostrar algo
 * que no es lo configurado, se agrega el valor tal cual como una opción más.
 */
function withCurrentValue(options: string[], value: string): string[] {
  return !value || options.includes(value) ? options : [value, ...options];
}
