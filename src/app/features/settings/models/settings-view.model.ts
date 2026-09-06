import type { FormControl } from '@angular/forms';
import type { UserNotificationPreferences } from '../../../core/models/notification.model';
import type { MasterSettings } from '../../../core/models/settings.model';
import type { UserRole } from '../../../core/models/user.model';
import type { CatalogOption } from '../../../core/services/locale-catalog.service';
export interface SettingsCard { title: string; description: string; icon: string; route: string; roles: UserRole[]; }
export interface SettingsCardView extends SettingsCard { available: boolean; }
export type PreferencesState = 'loading' | 'empty' | 'error' | 'success';
export interface PreferencesViewModel { state: PreferencesState; preferences: UserNotificationPreferences | null; message?: string; }
export type NotificationPreferenceForm = { [Key in keyof UserNotificationPreferences]: FormControl<boolean>; };
export type MasterSettingsState = 'loading' | 'error' | 'success';
/**
 * Un desplegable ya resuelto: las opciones del catálogo y cuál de ellas
 * corresponde a lo que guardó el backend. `selected` es el código de la opción,
 * no su etiqueta.
 */
export interface MasterSettingsField { options: CatalogOption[]; selected: string; }
export interface MasterSettingsViewModel {
  state: MasterSettingsState;
  settings: MasterSettings | null;
  currency: MasterSettingsField;
  language: MasterSettingsField;
  timeZone: MasterSettingsField;
  message?: string;
}
