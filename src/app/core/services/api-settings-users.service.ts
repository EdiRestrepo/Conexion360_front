import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  mapSettingsRolesResponse,
  mapSettingsUserResponse,
  mapSettingsUsersPageResponse,
} from '../mappers/settings-users.mapper';
import { SettingsRole, SettingsUser, SettingsUserUpdate, SettingsUsersPage } from '../models/settings-user.model';

/**
 * Usuarios de Auth0 vía el controlador `Settings` del backend.
 *
 * El SPA nunca habla con la Management API de Auth0: requiere el secreto de una
 * app M2M, que no puede vivir en el bundle. El backend hace de intermediario y
 * valida que quien llama sea ADMIN a partir del token (ver AGENTS.md §21).
 *
 * El header `Authorization` lo pone `authHttpInterceptorFn` para todo lo que
 * cuelgue de `environment.api.baseUrl`; aquí no se agrega a mano.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiSettingsUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.baseUrl}/settings`;

  list(page: number, pageSize: number): Observable<SettingsUsersPage> {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.max(pageSize, 1);
    const params = new HttpParams().set('page', String(safePage)).set('size', String(safePageSize));

    return this.http
      .get<unknown>(`${this.baseUrl}/listusers`, { params })
      .pipe(map((response) => mapSettingsUsersPageResponse(response, safePage, safePageSize)));
  }

  /**
   * Hoy no lo usa nadie: `listusers` ya trae por cada usuario los mismos campos,
   * así que reconsultar al abrir el detalle solo añadiría un spinner; y el menú
   * de usuario tampoco puede llamarlo, porque `/settings` es admin-only y el
   * autoservicio debe servir a cualquier rol.
   */
  getById(userId: string): Observable<SettingsUser> {
    const params = new HttpParams().set('userId', userId);

    return this.http
      .get<unknown>(`${this.baseUrl}/getuser`, { params })
      .pipe(map((response) => mapSettingsUserResponse(response)));
  }

  update(userId: string, changes: SettingsUserUpdate): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/updateuser/${encodeURIComponent(userId)}`, changes);
  }

  /** Inactivar equivale a bloquear en Auth0: el usuario deja de poder iniciar sesión. */
  setStatus(userId: string, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/updateuserstatus/${encodeURIComponent(userId)}`, { isActive });
  }

  listRoles(): Observable<SettingsRole[]> {
    return this.http.get<unknown>(`${this.baseUrl}/listroles`).pipe(map((response) => mapSettingsRolesResponse(response)));
  }

  // El `|` de `auth0|...` se codifica explícitamente: aunque el navegador lo
  // normalizaría a `%7C` por su cuenta, no es válido sin escapar en una URL y
  // depender de esa normalización rompería fuera del navegador (SSR, tests).
  delete(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/deleteuser/${encodeURIComponent(userId)}`);
  }
}
