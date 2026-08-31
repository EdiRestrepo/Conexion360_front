import { FormControl } from '@angular/forms';

import { SettingsUser } from '../../../../core/models/settings-user.model';

export interface SettingsUsersFilters {
  page: number;
  pageSize: number;
}

export interface SettingsUsersViewModel {
  state: 'loading' | 'empty' | 'error' | 'success';
  filters: SettingsUsersFilters;
  users: SettingsUser[];
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  message?: string;
}

/** Campos editables del `Auth0UserDto`; el resto del diálogo es solo lectura. */
export interface SettingsUserForm {
  userName: FormControl<string>;
  nickname: FormControl<string>;
  phoneNumber: FormControl<string>;
  isBlocked: FormControl<boolean>;
}
