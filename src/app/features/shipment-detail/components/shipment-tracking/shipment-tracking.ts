import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

import { Location, Shipment, ShipmentStatus } from '../../../../core/models/shipment.model';
import { getShipmentIssueTitle, getTransportModeIcon } from '../../../../core/utils/display-labels';
import { getLocationLabel } from '../../../../core/utils/shipment-format';
import type { Coordinates, TrackingStage } from '../../models/shipment-detail-view.model';

const trackingStageDefinitions = [
  { label: 'Pendiente', icon: 'inventory_2' },
  { label: 'Aduana origen', icon: 'account_balance' },
  { label: 'En tránsito', icon: '' },
  { label: 'Aduana destino', icon: 'account_balance' },
  { label: 'Entregado', icon: 'check_circle' },
] as const;

@Component({
  selector: 'app-shipment-tracking',
  imports: [MatIconModule],
  templateUrl: './shipment-tracking.html',
  styleUrl: './shipment-tracking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentTracking implements AfterViewChecked, OnDestroy {
  @ViewChild('trackingMap') private readonly trackingMapElement?: ElementRef<HTMLElement>;

  readonly shipmentData = input.required<Shipment>({ alias: 'shipment' });

  private map: L.Map | null = null;
  private mapKey = '';

  protected readonly mapError = signal(false);
  protected readonly getLocationLabel = getLocationLabel;
  protected readonly getIssueTitle = getShipmentIssueTitle;

  ngAfterViewChecked(): void {
    const element = this.trackingMapElement?.nativeElement;

    if (!element) {
      return;
    }

    const shipment = this.shipmentData();
    const key = `${shipment.id}-${this.getTrackingProgress(shipment)}`;

    if (this.map && this.mapKey === key) {
      this.map.invalidateSize();
      return;
    }

    this.renderMap(element, shipment, key);
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  protected getTrackingSummary(shipment: Shipment): string {
    return `Envío desde ${getLocationLabel(shipment.origin)} hacia ${getLocationLabel(shipment.destination)}, actualmente en ${this.getCurrentLocationLabel(shipment)}.`;
  }

  protected getTrackingProgress(shipment: Shipment): number {
    const stageIndex = this.getTrackingStageIndex(shipment);
    return Math.round((stageIndex / (trackingStageDefinitions.length - 1)) * 100);
  }

  protected getTrackingStages(shipment: Shipment): TrackingStage[] {
    const currentIndex = this.getTrackingStageIndex(shipment);

    return trackingStageDefinitions.map((stage, index) => ({
      label: stage.label,
      icon: stage.icon || getTransportModeIcon(shipment.transportMode),
      state: shipment.status === 'DELIVERED' || index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending',
    }));
  }

  protected hasTrackingCoordinates(shipment: Shipment): boolean {
    return Boolean(this.getCoordinates(shipment.origin) && this.getCoordinates(shipment.destination));
  }

  private getCurrentLocationLabel(shipment: Shipment): string {
    const stageIndex = this.getTrackingStageIndex(shipment);

    if (stageIndex <= 1) {
      return getLocationLabel(shipment.origin);
    }

    if (stageIndex === 2) {
      return shipment.transportMode === 'AIR' ? 'ruta aérea internacional' : 'ruta marítima internacional';
    }

    return getLocationLabel(shipment.destination);
  }

  private renderMap(element: HTMLElement, shipment: Shipment, key: string): void {
    this.destroyMap();
    const origin = this.getCoordinates(shipment.origin);
    const destination = this.getCoordinates(shipment.destination);

    if (!origin || !destination) {
      return;
    }

    try {
      this.map = L.map(element, { zoomControl: true, attributionControl: true });
      this.mapKey = key;
      this.mapError.set(false);

      const originPoint = L.latLng(origin.latitude, origin.longitude);
      const destinationPoint = L.latLng(destination.latitude, destination.longitude);
      const current = this.getCurrentCoordinates(origin, destination, this.getTrackingProgress(shipment));
      const currentPoint = L.latLng(current.latitude, current.longitude);
      const route = [originPoint, currentPoint, destinationPoint];

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      L.polyline(route, { color: '#00B8A9', weight: 4, dashArray: shipment.transportMode === 'AIR' ? '8 10' : undefined }).addTo(this.map);
      this.createMarker(originPoint, 'Origen').addTo(this.map);
      this.createMarker(destinationPoint, 'Destino').addTo(this.map);
      this.createMarker(currentPoint, 'Posición actual simulada', '#F97316').addTo(this.map);
      this.map.fitBounds(L.latLngBounds(route), { padding: [28, 28], maxZoom: 5 });
    } catch {
      this.mapError.set(true);
      this.destroyMap();
    }
  }

  private createMarker(point: L.LatLng, label: string, color = '#12355B'): L.CircleMarker {
    return L.circleMarker(point, {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2,
    }).bindTooltip(label);
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.mapKey = '';
    }
  }

  private getCurrentCoordinates(origin: Coordinates, destination: Coordinates, progress: number): Coordinates {
    const ratio = Math.min(Math.max(progress / 100, 0), 1);
    return {
      latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
    };
  }

  private getCoordinates(location: Location): Coordinates | null {
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return null;
    }

    return { latitude: location.latitude, longitude: location.longitude };
  }

  private getTrackingStageIndex(shipment: Shipment): number {
    // El estado del envío manda: la etapa marcada como "Ahora", la barra de progreso
    // y el chip del encabezado tienen que decir lo mismo.
    if (shipment.status !== 'WITH_ISSUE') {
      return this.getStageIndexFromStatus(shipment.status);
    }

    // 'Con novedad' no es una etapa del recorrido, así que se ubica en la más
    // avanzada que registre la bitácora del envío.
    return shipment.events.reduce((max, event) => Math.max(max, this.getStageIndexFromStatus(event.status)), 0);
  }

  private getStageIndexFromStatus(status: ShipmentStatus): number {
    const stageByStatus: Record<ShipmentStatus, number> = {
      PENDING: 0,
      ORIGIN_CUSTOMS: 1,
      IN_TRANSIT: 2,
      DESTINATION_CUSTOMS: 3,
      DELIVERED: 4,
      WITH_ISSUE: 0,
    };

    return stageByStatus[status];
  }
}
