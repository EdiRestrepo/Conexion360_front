import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { MasterListLoadState } from '../../../models/settings-view.model';

/**
 * Marco común de los tres listados del maestro: título con conteo y los
 * estados de carga, vacío y error. El contenido del estado `success` se
 * proyecta, porque clientes y colaboradores se pintan como chips y las
 * asociaciones como tabla.
 */
@Component({
  selector: 'app-master-list',
  imports: [MatButtonModule],
  templateUrl: './master-list.html',
  styleUrl: './master-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterList {
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly state = input.required<MasterListLoadState>();
  readonly count = input(0);
  readonly emptyMessage = input.required<string>();
  readonly errorMessage = input.required<string>();
  readonly retry = output<void>();
}
