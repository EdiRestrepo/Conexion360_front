import { Injectable } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';

import { MasterDataGroup, SimulatedUser } from '../../core/models/settings.model';
import { UserRole } from '../../core/models/user.model';

export type MockSettingsResponseMode = 'success' | 'empty' | 'error';

interface MockSettingsSimulationConfig {
  latencyMs?: number;
  responseMode?: MockSettingsResponseMode;
}

const defaultLatencyMs = 250;

const initialUsers: SimulatedUser[] = [
  { id: 'user-001', fullName: 'Edison Estival', email: 'edisonestival@gmail.com', company: 'Cliente demo', role: 'CLIENT', status: 'ACTIVE' },
  { id: 'user-002', fullName: 'Laura Méndez', email: 'laura.mendez@conexion360.com', company: 'TCC', role: 'OPERATOR', status: 'ACTIVE' },
  { id: 'user-003', fullName: 'Admin Conexion360', email: 'admin@conexion360.com', company: 'Conexion360', role: 'ADMIN', status: 'ACTIVE' },
  { id: 'user-004', fullName: 'Carlos Restrepo', email: 'carlos.restrepo@cliente.com', company: 'Nutresa', role: 'CLIENT', status: 'INACTIVE' },
];

const masterData: MasterDataGroup[] = [
  { id: 'statuses', title: 'Estados', items: ['Pendiente', 'Bodega origen', 'Aduana origen', 'En tránsito', 'Aduana destino', 'Nacionalizado', 'Bodega destino', 'Despachado', 'Entregado', 'Con novedad', 'Cancelado'] },
  { id: 'modes', title: 'Modalidades', items: ['Aéreo', 'Marítimo'] },
  { id: 'documents', title: 'Tipos de documento', items: ['HBL', 'AWB', 'MBL', 'Factura comercial', 'Lista de empaque', 'BL'] },
  { id: 'incoterms', title: 'Incoterms', items: ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'] },
  { id: 'containers', title: 'Tipos de contenedor', items: ['20GP', '40GP', '40HC', 'Refrigerado', 'Open Top'] },
];

@Injectable({ providedIn: 'root' })
export class MockSettingsService {
  private simulationConfig: Required<MockSettingsSimulationConfig> = {
    latencyMs: defaultLatencyMs,
    responseMode: 'success',
  };

  private users = [...initialUsers];

  configureSimulation(config: MockSettingsSimulationConfig): void {
    this.simulationConfig = { ...this.simulationConfig, ...config };
  }

  resetSimulation(): void {
    this.simulationConfig = { latencyMs: defaultLatencyMs, responseMode: 'success' };
    this.users = [...initialUsers];
  }

  getUsers(): Observable<SimulatedUser[]> {
    return this.respondWith(this.users);
  }

  searchUsers(query: string, role: UserRole | 'ALL'): Observable<SimulatedUser[]> {
    const normalizedQuery = query.trim().toLowerCase();

    return this.getUsers().pipe(
      map((users) =>
        users.filter((user) => {
          const matchesRole = role === 'ALL' ? true : user.role === role;
          const searchable = `${user.fullName} ${user.email} ${user.company}`.toLowerCase();
          const matchesQuery = normalizedQuery ? searchable.includes(normalizedQuery) : true;

          return matchesRole && matchesQuery;
        }),
      ),
    );
  }

  toggleUserStatus(userId: string): Observable<SimulatedUser | null> {
    const user = this.users.find((item) => item.id === userId) ?? null;

    if (!user) {
      return this.respondWith(null);
    }

    const updatedUser: SimulatedUser = {
      ...user,
      status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
    this.users = this.users.map((item) => (item.id === userId ? updatedUser : item));

    return this.respondWith(updatedUser);
  }

  getMasterData(): Observable<MasterDataGroup[]> {
    return this.respondWith(masterData);
  }

  simulateMasterDataSave(groupId: string): Observable<MasterDataGroup | null> {
    return this.respondWith(masterData.find((group) => group.id === groupId) ?? null);
  }

  private respondWith<T>(value: T): Observable<T> {
    if (this.simulationConfig.responseMode === 'error') {
      return throwError(() => new Error('Error simulado en ajustes')).pipe(delay(this.simulationConfig.latencyMs));
    }

    if (this.simulationConfig.responseMode === 'empty') {
      return of((Array.isArray(value) ? [] : null) as T).pipe(delay(this.simulationConfig.latencyMs));
    }

    return of(value).pipe(delay(this.simulationConfig.latencyMs));
  }
}
