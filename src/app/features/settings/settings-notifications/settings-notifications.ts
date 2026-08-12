import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap, take } from 'rxjs';

import { UserNotificationPreferences } from '../../../core/models/notification.model';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { NotificationPreferencesService } from '../../../core/services/notification-preferences.service';
import type { NotificationPreferenceForm, PreferencesState, PreferencesViewModel } from '../models/settings-view.model';

const defaultPreferences: UserNotificationPreferences = {
  email: true,
  inApp: true,
  sms: false,
  shipmentStatusChanges: true,
  delivery: true,
  delays: true,
  shipmentEnRoute: false,
  deliveryReminders: false,
};

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
  private readonly currentAuth0UserId = signal<string | null>(null);

  protected readonly saveMessage = signal<string | null>(null);
  protected readonly form = new FormGroup<NotificationPreferenceForm>({
    email: new FormControl(defaultPreferences.email, { nonNullable: true }),
    inApp: new FormControl(defaultPreferences.inApp, { nonNullable: true }),
    sms: new FormControl(defaultPreferences.sms, { nonNullable: true }),
    shipmentStatusChanges: new FormControl(defaultPreferences.shipmentStatusChanges, { nonNullable: true }),
    delivery: new FormControl(defaultPreferences.delivery, { nonNullable: true }),
    delays: new FormControl(defaultPreferences.delays, { nonNullable: true }),
    shipmentEnRoute: new FormControl(defaultPreferences.shipmentEnRoute, { nonNullable: true }),
    deliveryReminders: new FormControl(defaultPreferences.deliveryReminders, { nonNullable: true }),
  });

  protected readonly viewModel$: Observable<PreferencesViewModel> = this.auth0Facade.user$.pipe(
    switchMap((identity) => {
      if (!identity) {
        return of({ state: 'empty', preferences: null, message: 'No hay identidad autenticada para cargar preferencias.' } satisfies PreferencesViewModel);
      }

      this.currentAuth0UserId.set(identity.auth0UserId);

      return this.preferencesService.getPreferences(identity.auth0UserId).pipe(
        map((storedPreferences) => {
          const preferences = { ...defaultPreferences, ...(storedPreferences ?? {}) };
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
