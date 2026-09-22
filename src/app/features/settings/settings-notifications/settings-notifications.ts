import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap, take } from 'rxjs';

import { NotificationSettings, defaultNotificationPreferences } from '../../../core/models/notification.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import type { NotificationPreferenceForm, PreferencesViewModel } from '../models/settings-view.model';

@Component({
  selector: 'app-settings-notifications',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-notifications.html',
  styleUrl: './settings-notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNotifications {
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly settingsService = inject(ApiSettingsService);
  /**
   * Los ajustes tal como los devolvió el backend. Guardan los ids con los que
   * el servicio decide entre crear y actualizar, y se refrescan después de cada
   * guardado para que el segundo ya edite en vez de volver a crear.
   */
  private readonly currentSettings = signal<NotificationSettings | null>(null);

  protected readonly saveMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = new FormGroup<NotificationPreferenceForm>({
    email: new FormControl(defaultNotificationPreferences.email, { nonNullable: true }),
    inApp: new FormControl(defaultNotificationPreferences.inApp, { nonNullable: true }),
    sms: new FormControl(defaultNotificationPreferences.sms, { nonNullable: true }),
    shipmentStatusChanges: new FormControl(defaultNotificationPreferences.shipmentStatusChanges, { nonNullable: true }),
    delivery: new FormControl(defaultNotificationPreferences.delivery, { nonNullable: true }),
    delays: new FormControl(defaultNotificationPreferences.delays, { nonNullable: true }),
    shipmentEnRoute: new FormControl(defaultNotificationPreferences.shipmentEnRoute, { nonNullable: true }),
    deliveryReminders: new FormControl(defaultNotificationPreferences.deliveryReminders, { nonNullable: true }),
  });

  protected readonly viewModel$: Observable<PreferencesViewModel> = this.auth0Facade.user$.pipe(
    switchMap((identity) => {
      if (!identity) {
        return of({
          state: 'empty',
          preferences: null,
          message: 'No hay identidad autenticada para cargar preferencias.',
        } satisfies PreferencesViewModel);
      }

      return this.settingsService.getNotificationSettings().pipe(
        map((settings) => {
          this.currentSettings.set(settings);
          this.form.patchValue(settings.preferences, { emitEvent: false });

          return { state: 'success', preferences: settings.preferences } satisfies PreferencesViewModel;
        }),
        startWith({ state: 'loading', preferences: null } satisfies PreferencesViewModel),
        catchError(() =>
          of({
            state: 'error',
            preferences: null,
            message: 'No fue posible cargar las preferencias.',
          } satisfies PreferencesViewModel),
        ),
      );
    }),
  );

  protected savePreferences(): void {
    const settings = this.currentSettings();

    if (!settings) {
      this.saveMessage.set('No fue posible guardar las preferencias.');
      return;
    }

    this.saveMessage.set(null);
    this.saving.set(true);
    this.settingsService
      .saveNotificationSettings(this.form.getRawValue(), settings)
      // Releer deja en memoria los ids que el backend acaba de asignar en el
      // alta; sin ellos, guardar dos veces seguidas crearía dos veces. Si esa
      // relectura falla, el guardado ya se hizo y no debe reportarse como error.
      .pipe(
        switchMap(() => this.settingsService.getNotificationSettings().pipe(catchError(() => of(null)))),
        take(1),
      )
      .subscribe({
        next: (refreshedSettings) => {
          if (refreshedSettings) {
            this.currentSettings.set(refreshedSettings);
          }

          this.saving.set(false);
          this.saveMessage.set('Preferencias guardadas.');
        },
        error: () => {
          this.saving.set(false);
          this.saveMessage.set('No fue posible guardar las preferencias.');
        },
      });
  }
}
