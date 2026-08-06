import { UserRole } from './user.model';

export type SettingsViewState = 'loading' | 'empty' | 'error' | 'success';

export type SettingsUserStatus = 'ACTIVE' | 'INACTIVE';

export interface SettingsUser {
  id: string;
  fullName: string;
  email: string;
  company: string;
  role: UserRole;
  status: SettingsUserStatus;
}

export interface MasterDataGroup {
  id: string;
  title: string;
  items: string[];
}
