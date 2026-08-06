import type { ReportMetrics } from '../../../core/models/shipment.model';
export type ReportsState = 'loading' | 'empty' | 'error' | 'success';
export type ChartKind = 'doughnut' | 'bar';
export interface MetricCard { label: string; value: string; icon: string; }
export interface ChartValue { label: string; value: number; }
export interface ReportChart { id: string; title: string; kind: ChartKind; values: ChartValue[]; summary: string; }
export interface ReportsViewModel { state: ReportsState; metrics: ReportMetrics | null; indicators: MetricCard[]; financials: MetricCard[]; charts: ReportChart[]; message?: string; }
