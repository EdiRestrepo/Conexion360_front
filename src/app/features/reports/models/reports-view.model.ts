import type { ReportMetrics } from '../../../core/models/shipment.model';
export type ReportsState = 'loading' | 'empty' | 'error' | 'success';
export type ChartKind = 'doughnut' | 'bar';
export interface MetricCard { label: string; value: string; icon: string; caption?: string; }
export interface ChartValue { label: string; value: number; icon?: string; }
export interface ReportChart { id: string; title: string; kind: ChartKind; values: ChartValue[]; summary: string; }
export interface StatusBreakdownItem { label: string; value: number; percentage: number; toneClass: string; }
export interface ReportsViewModel {
  state: ReportsState;
  metrics: ReportMetrics | null;
  indicators: MetricCard[];
  financials: MetricCard[];
  charts: ReportChart[];
  statusBreakdown: StatusBreakdownItem[];
  topRoutes: ChartValue[];
  message?: string;
}
