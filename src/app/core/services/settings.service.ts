
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MasterDataGroup, SettingsUser } from '../models/settings.model';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly masterData: MasterDataGroup[] = [
    { id: 'statuses', title: 'Estados', items: ['Pendiente', 'En tránsito', 'Entregado'] },
    { id: 'modes', title: 'Modalidades', items: ['Aéreo', 'Marítimo'] },
    { id: 'documents', title: 'Tipos de documento', items: ['HBL', 'AWB', 'MBL'] },
    { id: 'incoterms', title: 'Incoterms', items: ['FOB', 'DAP', 'CIF'] },
    { id: 'containers', title: 'Tipos de contenedor', items: ['20GP', '40HC', '40OT'] },
  ];

  private readonly users: SettingsUser[] = [
    { id: 'user-001', fullName: 'Edison Estival', email: 'edison@demo.com', company: 'Cliente demo', role: 'CLIENT', status: 'ACTIVE' },
    { id: 'user-002', fullName: 'Laura Méndez', email: 'laura@conexion360.com', company: 'TCC', role: 'ANALISTAOPE', status: 'ACTIVE' },
    { id: 'user-003', fullName: 'Admin Conexion360', email: 'admin@conexion360.com', company: 'Conexion360', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'user-004', fullName: 'Carlos Restrepo', email: 'carlos@cliente.com', company: 'Nutresa', role: 'CLIENT', status: 'INACTIVE' },
  ];

  getMasterData(): Observable<MasterDataGroup[]> {
    return of(this.masterData);
  }

  saveMasterData(groupId: string): Observable<MasterDataGroup | null> {
    const group = this.masterData.find((item) => item.id === groupId) ?? null;
    return of(group);
  }

  searchUsers(query: string, role: UserRole | 'ALL'): Observable<SettingsUser[]> {
    const normalizedQuery = query.trim().toLowerCase();

    return of(
      this.users.filter((user) => {
        const matchesRole = role === 'ALL' ? true : user.role === role;
        const matchesQuery = normalizedQuery
          ? `${user.fullName} ${user.email} ${user.company}`.toLowerCase().includes(normalizedQuery)
          : true;

        return matchesRole && matchesQuery;
      }),
    );
  }

  toggleUserStatus(userId: string): Observable<SettingsUser | null> {
    const userIndex = this.users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return of(null);
    }

    const user = this.users[userIndex];
    const updatedUser: SettingsUser = {
      ...user,
      status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };

    this.users[userIndex] = updatedUser;
    return of(updatedUser);
  }
}
