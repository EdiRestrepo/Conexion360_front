import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Maestro de clientes colaboradores.
 *
 * Reemplaza a la pantalla de ajustes maestros, que solo sabía leer
 * `GET /settings/viewmaster` y no tenía endpoint para guardar. Queda como
 * cascarón —cabecera y vuelta a Ajustes— hasta que se defina qué administra.
 */
@Component({
  selector: 'app-settings-clients-collaborators',
  imports: [MatIconModule, RouterLink],
  templateUrl: './settings-clients-collaborators.html',
  styleUrl: './settings-clients-collaborators.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsClientsCollaborators {}
