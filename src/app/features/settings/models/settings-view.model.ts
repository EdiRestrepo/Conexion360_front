import type { FormControl } from '@angular/forms';
import type { UserNotificationPreferences } from '../../../core/models/notification.model';
import type { MasterSettings } from '../../../core/models/settings.model';
import type { UserRole } from '../../../core/models/user.model';
export interface SettingsCard { title: string; description: string; icon: string; route: string; roles: UserRole[]; }
export interface SettingsCardView extends SettingsCard { available: boolean; }
export type PreferencesState = 'loading' | 'empty' | 'error' | 'success';
export interface PreferencesViewModel { state: PreferencesState; preferences: UserNotificationPreferences | null; message?: string; }
export type NotificationPreferenceForm = { [Key in keyof UserNotificationPreferences]: FormControl<boolean>; };
export type MasterSettingsState = 'loading' | 'error' | 'success';
export interface MasterSettingsViewModel {
  state: MasterSettingsState;
  settings: MasterSettings | null;
  /** Opciones de cada desplegable, con el valor del backend incluido aunque no estuviera en la lista fija. */
  currencies: string[];
  languages: string[];
  timeZones: string[];
  message?: string;
}
