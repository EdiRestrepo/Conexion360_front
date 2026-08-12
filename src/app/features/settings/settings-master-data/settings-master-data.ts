import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-master-data',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './settings-master-data.html',
  styleUrl: './settings-master-data.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMasterData {
  protected readonly saveMessage = signal<string | null>(null);

  protected saveConfiguration(): void {
    this.saveMessage.set('Configuración guardada.');
  }
}
