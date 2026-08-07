
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MasterDataGroup } from '../models/settings.model';

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

  getMasterData(): Observable<MasterDataGroup[]> {
    return of(this.masterData);
  }

  saveMasterData(groupId: string): Observable<MasterDataGroup | null> {
    const group = this.masterData.find((item) => item.id === groupId) ?? null;
    return of(group);
  }
}
