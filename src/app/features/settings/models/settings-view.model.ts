import type { FormControl } from '@angular/forms';
import type { MasterDataGroup, SettingsUser, SettingsViewState } from '../../../core/models/settings.model';
import type { NotificationPreference, UserProfile } from '../../../core/models/user-profile.model';
import type { UserRole } from '../../../core/models/user.model';
export interface SettingsCard { title: string; description: string; icon: string; route: string; roles: UserRole[]; }
export interface SettingsCardView extends SettingsCard { available: boolean; }
export type PreferencesState = 'loading' | 'empty' | 'error' | 'success';
export interface PreferencesViewModel { state: PreferencesState; profile: UserProfile | null; message?: string; }
export type NotificationPreferenceForm = { [Key in keyof NotificationPreference]: FormControl<boolean>; };
export interface UsersViewModel { state: SettingsViewState; users: SettingsUser[]; message?: string; }
export interface MasterDataViewModel { state: SettingsViewState; groups: MasterDataGroup[]; message?: string; }
