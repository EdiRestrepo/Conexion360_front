import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, catchError, combineLatest, map, of, startWith, switchMap, take } from 'rxjs';

import { defaultNotificationPreferences } from '../../../core/models/notification.model';
import { ApiSettingsService } from '../../../core/services/api-settings.service';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { NotificationPreferencesService } from '../../../core/services/notification-preferences.service';
import type { NotificationPreferenceForm, PreferencesState, PreferencesViewModel } from '../models/settings-view.model';

@Component({
  selector: 'app-settings-notifications',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-notifications.html',
  styleUrl: './settings-notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNotifications {
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly preferencesService = inject(NotificationPreferencesService);
  private readonly settingsService = inject(ApiSettingsService);
  private readonly currentAuth0UserId = signal<string | null>(null);

  protected readonly saveMessage = signal<string | null>(null);
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
        return of({ state: 'empty', preferences: null, message: 'No hay identidad autenticada para cargar preferencias.' } satisfies PreferencesViewModel);
      }

      this.currentAuth0UserId.set(identity.auth0UserId);

      // El backend manda la configuración del cliente y el navegador lo que el
      // usuario guardó aquí; lo local gana porque es lo único que conserva sus
      // cambios mientras no exista un endpoint para persistirlos.
      return combineLatest([
        this.settingsService.getNotificationSettings(),
        this.preferencesService.getPreferences(identity.auth0UserId),
      ]).pipe(
        map(([clientPreferences, storedPreferences]) => {
          const preferences = { ...clientPreferences, ...(storedPreferences ?? {}) };
          this.form.patchValue(preferences, { emitEvent: false });

          return { state: 'success', preferences } satisfies PreferencesViewModel;
        }),
        startWith({ state: 'loading', preferences: null } satisfies PreferencesViewModel),
        catchError(() => of({ state: 'error', preferences: null, message: 'No fue posible cargar las preferencias.' } satisfies PreferencesViewModel)),
      );
    }),
  );

  protected savePreferences(): void {
    const auth0UserId = this.currentAuth0UserId();

    if (!auth0UserId) {
      this.saveMessage.set('No hay identidad de Auth0 disponible para guardar preferencias.');
      return;
    }

    this.saveMessage.set(null);
    this.preferencesService
      .savePreferences(auth0UserId, this.form.getRawValue())
      .pipe(take(1))
      .subscribe({
        next: () => this.saveMessage.set('Preferencias guardadas.'),
        error: () => this.saveMessage.set('No fue posible guardar las preferencias.'),
      });
  }
}
