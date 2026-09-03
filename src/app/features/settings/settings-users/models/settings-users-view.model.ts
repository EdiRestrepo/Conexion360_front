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

/**
 * Campos que el diálogo permite editar. `userName` y `nickname` siguen siendo
 * parte del `Auth0UserDto` que exige el PATCH, pero ya no se muestran en la
 * tabla ni en el formulario: se reenvían sin cambios desde `UserDetailDialog`.
 */
export interface SettingsUserForm {
  phoneNumber: FormControl<string>;
  email: FormControl<string>;
  isBlocked: FormControl<boolean>;
}
