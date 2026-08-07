import type { DashboardMetrics } from '../../../core/models/shipment.model';
import type { HomeShipmentSummary } from '../../../core/services/api-home.service';
export type DashboardSearchState = 'idle' | 'loading' | 'success' | 'empty' | 'error';
export interface DashboardMetricCardItem { label: string; value: number; icon: string; }
export interface DashboardMetricCard { label: string; value: number; icon: string; detail: string; tone: 'primary' | 'secondary' | 'success' | 'warning'; items?: DashboardMetricCardItem[]; }
export interface DashboardDistributionItem { label: string; count: number; percentage: number; icon: string; }
export interface DashboardViewModel { state: 'loading' | 'empty' | 'error' | 'success'; metrics: DashboardMetrics | null; recentShipments: HomeShipmentSummary[]; cards: DashboardMetricCard[]; operationDistribution: DashboardDistributionItem[]; modeDistribution: DashboardDistributionItem[]; message?: string; }
