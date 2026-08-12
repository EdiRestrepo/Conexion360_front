import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { UserNotificationPreferences } from '../models/notification.model';

type PreferencesByUser = Record<string, UserNotificationPreferences>;

@Injectable({
  providedIn: 'root',
})
export class NotificationPreferencesService {
  private readonly storageKey = 'conexion360.notification-preferences';

  getPreferences(auth0UserId: string): Observable<UserNotificationPreferences | null> {
    return of(this.readPreferences()[auth0UserId] ?? null);
  }

  savePreferences(auth0UserId: string, preferences: UserNotificationPreferences): Observable<UserNotificationPreferences> {
    const currentPreferences = this.readPreferences();
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        ...currentPreferences,
        [auth0UserId]: preferences,
      }),
    );

    return of(preferences);
  }

  private readPreferences(): PreferencesByUser {
    const rawPreferences = localStorage.getItem(this.storageKey);

    if (!rawPreferences) {
      return {};
    }

    try {
      const parsedPreferences = JSON.parse(rawPreferences) as unknown;
      return this.isPreferencesByUser(parsedPreferences) ? parsedPreferences : {};
    } catch {
      localStorage.removeItem(this.storageKey);
      return {};
    }
  }

  private isPreferencesByUser(value: unknown): value is PreferencesByUser {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    return Object.values(value).every((preferences) => this.isNotificationPreference(preferences));
  }

  private isNotificationPreference(value: unknown): value is UserNotificationPreferences {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const preferences = value as Partial<Record<keyof UserNotificationPreferences, unknown>>;

    return (
      typeof preferences.email === 'boolean' &&
      typeof preferences.inApp === 'boolean' &&
      typeof preferences.sms === 'boolean' &&
      typeof preferences.shipmentStatusChanges === 'boolean' &&
      typeof preferences.delivery === 'boolean' &&
      typeof preferences.delays === 'boolean' &&
      typeof preferences.shipmentEnRoute === 'boolean' &&
      typeof preferences.deliveryReminders === 'boolean'
    );
  }
}
