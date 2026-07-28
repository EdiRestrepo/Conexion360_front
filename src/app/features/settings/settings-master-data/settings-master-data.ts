import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, startWith, switchMap, take } from 'rxjs';

import { MasterDataGroup, SettingsViewState } from '../../../core/models/settings.model';
import { MockSettingsService } from '../../../mocks/services/mock-settings.service';

interface MasterDataViewModel {
  state: SettingsViewState;
  groups: MasterDataGroup[];
  message?: string;
}

@Component({
  selector: 'app-settings-master-data',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './settings-master-data.html',
  styleUrl: './settings-master-data.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMasterData {
  private readonly settingsService = inject(MockSettingsService);
  private readonly retry$ = new Subject<void>();

  protected readonly saveMessage = signal<string | null>(null);
  protected readonly viewModel$: Observable<MasterDataViewModel> = this.retry$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.settingsService.getMasterData().pipe(
        map((groups) => ({
          state: groups.length ? 'success' : 'empty',
          groups,
          message: groups.length ? undefined : 'No hay catálogos maestros disponibles.',
        } satisfies MasterDataViewModel)),
        startWith({ state: 'loading', groups: [] } satisfies MasterDataViewModel),
        catchError(() => of({ state: 'error', groups: [], message: 'No fue posible cargar los catálogos maestros.' } satisfies MasterDataViewModel)),
      ),
    ),
  );

  protected retry(): void {
    this.retry$.next();
  }

  protected simulateSave(group: MasterDataGroup): void {
    this.saveMessage.set(null);
    this.settingsService
      .simulateMasterDataSave(group.id)
      .pipe(take(1))
      .subscribe({
        next: () => this.saveMessage.set('Cambios maestros guardados de forma simulada.'),
        error: () => this.saveMessage.set('No fue posible guardar el catálogo simulado.'),
      });
  }
}