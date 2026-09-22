import type { FormControl } from '@angular/forms';
import type { UserNotificationPreferences } from '../../../core/models/notification.model';
import type { UserRole } from '../../../core/models/user.model';
export interface SettingsCard { title: string; description: string; icon: string; route: string; roles: UserRole[]; }
export interface SettingsCardView extends SettingsCard { available: boolean; }
export type PreferencesState = 'loading' | 'empty' | 'error' | 'success';
export interface PreferencesViewModel { state: PreferencesState; preferences: UserNotificationPreferences | null; message?: string; }
export type NotificationPreferenceForm = { [Key in keyof UserNotificationPreferences]: FormControl<boolean>; };
/**
 * Estado de cada una de las tres acciones del maestro de clientes
 * colaboradores. Van por separado —una por formulario— para que el resultado
 * de un alta no borre ni contradiga el de otra.
 */
export type MasterActionState = 'idle' | 'pending' | 'success' | 'error';
export interface MasterActionStatus { state: MasterActionState; message: string | null; }
export type DocumentForm = { clientId: FormControl<string>; };
export type LinkForm = { clientId: FormControl<string>; collaborator: FormControl<string>; };
