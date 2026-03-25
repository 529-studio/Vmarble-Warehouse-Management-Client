import type {
  RemnantSummary,
  CuttingEfficiency,
  CostingReport,
  OverflowStatus,
} from '@/types/api'
import { apiClient } from './client'

export const dashboardApi = {
  getRemnantSummary: () =>
    apiClient.get<RemnantSummary>('/dashboard/remnant-summary'),

  getCuttingEfficiency: (params?: { period?: 'week' | 'month' }) =>
    apiClient.get<CuttingEfficiency[]>('/dashboard/cutting-efficiency', {
      params,
    }),

  getOverflowHistory: () =>
    apiClient.get<OverflowStatus[]>('/dashboard/overflow-history'),

  getCostingReport: (poId: string) =>
    apiClient.get<CostingReport>('/costing/reports', { params: { poId } }),
}
