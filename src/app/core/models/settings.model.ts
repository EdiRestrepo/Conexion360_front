export type SettingsViewState = 'loading' | 'empty' | 'error' | 'success';

export type SimulatedUserStatus = 'ACTIVE' | 'INACTIVE';

export interface SimulatedUser {
  id: string;
  fullName: string;
  email: string;
  company: string;
  role: 'CLIENT' | 'OPERATOR' | 'ADMIN';
  status: SimulatedUserStatus;
}

export interface MasterDataGroup {
  id: string;
  title: string;
  items: string[];
}
