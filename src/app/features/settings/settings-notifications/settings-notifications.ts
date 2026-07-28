import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, map, of, startWith, switchMap, take, tap } from 'rxjs';

import { NotificationPreference, UserProfile } from '../../../core/models/user-profile.model';
import { Auth0FacadeService } from '../../../core/services/auth0-facade.service';
import { MockUserProfileService } from '../../../mocks/services/mock-user-profile.service';

type PreferencesState = 'loading' | 'empty' | 'error' | 'success';

interface PreferencesViewModel {
  state: PreferencesState;
  profile: UserProfile | null;
  message?: string;
}

type NotificationPreferenceForm = {
  [Key in keyof NotificationPreference]: FormControl<boolean>;
};

const defaultPreferences: NotificationPreference = {
  email: true,
  inApp: true,
  shipmentStatusChanges: true,
  delays: true,
  delivery: true,
  documents: true,
  containers: true,
};

@Component({
  selector: 'app-settings-notifications',
  imports: [AsyncPipe, MatButtonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './settings-notifications.html',
  styleUrl: './settings-notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNotifications {
  private readonly auth0Facade = inject(Auth0FacadeService);
  private readonly userProfileService = inject(MockUserProfileService);
  private readonly currentProfile = signal<UserProfile | null>(null);

  protected readonly saveMessage = signal<string | null>(null);
  protected readonly form = new FormGroup<NotificationPreferenceForm>({
    email: new FormControl(defaultPreferences.email, { nonNullable: true }),
    inApp: new FormControl(defaultPreferences.inApp, { nonNullable: true }),
    shipmentStatusChanges: new FormControl(defaultPreferences.shipmentStatusChanges, { nonNullable: true }),
    delays: new FormControl(defaultPreferences.delays, { nonNullable: true }),
    delivery: new FormControl(defaultPreferences.delivery, { nonNullable: true }),
    documents: new FormControl(defaultPreferences.documents, { nonNullable: true }),
    containers: new FormControl(defaultPreferences.containers, { nonNullable: true }),
  });

  protected readonly viewModel$: Observable<PreferencesViewModel> = this.auth0Facade.user$.pipe(
    switchMap((identity) => {
      if (!identity) {
        return of({ state: 'empty', profile: null, message: 'No hay identidad autenticada para cargar preferencias.' } satisfies PreferencesViewModel);
      }

      return this.userProfileService.getProfileByAuth0Id(identity.auth0UserId).pipe(
        map((profile) => {
          if (!profile) {
            return { state: 'empty', profile: null, message: 'Completa tu perfil para configurar preferencias.' } satisfies PreferencesViewModel;
          }

          const preferences = { ...defaultPreferences, ...profile.notificationPreferences };
          const nextProfile = { ...profile, notificationPreferences: preferences };
          this.currentProfile.set(nextProfile);
          this.form.patchValue(preferences, { emitEvent: false });

          return { state: 'success', profile: nextProfile } satisfies PreferencesViewModel;
        }),
        startWith({ state: 'loading', profile: null } satisfies PreferencesViewModel),
        catchError(() => of({ state: 'error', profile: null, message: 'No fue posible cargar las preferencias.' } satisfies PreferencesViewModel)),
      );
    }),
  );

  protected savePreferences(): void {
    const profile = this.currentProfile();

    if (!profile) {
      this.saveMessage.set('No hay perfil disponible para guardar preferencias.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      notificationPreferences: this.form.getRawValue(),
    };

    this.saveMessage.set(null);
    this.userProfileService
      .saveProfile(updatedProfile)
      .pipe(take(1))
      .subscribe({
        next: (savedProfile) => {
          this.currentProfile.set(savedProfile);
          this.saveMessage.set('Preferencias guardadas de forma simulada.');
        },
        error: () => this.saveMessage.set('No fue posible guardar las preferencias simuladas.'),
      });
  }
}
