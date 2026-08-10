import type { Params } from '@angular/router';
import type { Shipment } from '../../../core/models/shipment.model';
export type DetailState = 'loading' | 'error' | 'not-found' | 'success';
export type DetailTab = 'summary' | 'tracking' | 'dates' | 'container' | 'financial' | 'history';
export type TrackingStageState = 'completed' | 'current' | 'pending';
export interface DetailViewModel { state: DetailState; selectedTab: DetailTab; listQueryParams: Params; shipment: Shipment | null; message?: string; }
export interface TabItem { id: DetailTab; label: string; }
export interface DetailField { label: string; value: string; accent?: boolean; empty?: boolean; }
export interface LogisticDateRow { label: string; date: string; }
export interface TrackingStage { label: string; icon: string; state: TrackingStageState; }
export interface NextStop { location: string; date: string; }
export interface Coordinates { latitude: number; longitude: number; }
