import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith } from 'rxjs';

import { MasterSettings } from '../../../core/models/settings.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { CatalogOption, LocaleCatalogService } from '../../../core/services/locale-catalog.service';
import { CatalogSelect } from '../components/catalog-select/catalog-select';
import type { MasterSettingsField, MasterSettingsViewModel } from '../models/settings-view.model';

const emptyField: MasterSettingsField = { options: [], selected: '' };

const loadingViewModel: MasterSettingsViewModel = {
  state: 'loading',
  settings: null,
  currency: emptyField,
  language: emptyField,
  timeZone: emptyField,
};

@Component({
  selector: 'app-settings-master-data',
  imports: [AsyncPipe, CatalogSelect, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './settings-master-data.html',
  styleUrl: './settings-master-data.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMasterData {
  private readonly settingsService = inject(ApiSettingsService);
  private readonly catalog = inject(LocaleCatalogService);

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
      currency: this.resolveField(this.catalog.currencies(), settings.currency),
      language: this.resolveField(this.catalog.languages(), settings.language),
      timeZone: this.resolveField(this.catalog.timeZones(), settings.timeZone),
    };
  }

  /**
   * Empareja lo que guardó el backend con el catálogo. Mientras `viewmaster`
   * devuelva etiquetas (`America/Bogota(UTC-5)`), el emparejado lo resuelve
   * `match()`; cuando devuelva códigos, esto sigue valiendo sin cambios.
   *
   * Un valor que no se reconoce entra tal cual como opción propia: es preferible
   * enseñar algo raro pero cierto a enseñar la opción más parecida y hacer creer
   * que la configuración es otra.
   */
  private resolveField(options: CatalogOption[], rawValue: string): MasterSettingsField {
    if (!rawValue) {
      return { options, selected: '' };
    }

    const match = this.catalog.match(options, rawValue);

    return match
      ? { options, selected: match.value }
      : { options: [{ value: rawValue, label: rawValue }, ...options], selected: rawValue };
  }
}
