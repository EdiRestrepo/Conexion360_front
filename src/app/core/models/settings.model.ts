export type SettingsViewState = 'loading' | 'empty' | 'error' | 'success';

export interface MasterDataGroup {
  id: string;
  title: string;
  items: string[];
}
