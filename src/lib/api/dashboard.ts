import type { OverviewOutput } from '@/types/api'
import { apiClient } from './client'

export const dashboardApi = {
  /** GET /api/v1/dashboard/overview */
  getOverview: () => apiClient.get<OverviewOutput>('/dashboard/overview'),
}
