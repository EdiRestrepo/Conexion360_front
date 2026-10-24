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
 * Campos que el diálogo permite editar. `document` no está: es el `idClient`
 * con el que el backend cruza envíos y el maestro de clientes, y cambiarlo
 * dejaría huérfano lo ya asociado. `userName` y `nickname` se reenvían sin
 * cambios desde `UserDetailDialog`.
 */
export interface SettingsUserForm {
  fullName: FormControl<string>;
  company: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  roleId: FormControl<string>;
  /** En positivo a proposito: el checkbox marcado significa "puede entrar". */
  isActive: FormControl<boolean>;
}
