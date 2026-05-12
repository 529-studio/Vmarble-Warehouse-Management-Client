import type { OverviewOutput, WIPPipelineOutput } from '@/types/api'
import { apiClient } from './client'

export const dashboardApi = {
  /** GET /api/v1/dashboard/overview */
  getOverview: () => apiClient.get<OverviewOutput>('/dashboard/overview'),

  /** GET /api/v1/dashboard/wip-pipeline */
  getWIPPipeline: () => apiClient.get<WIPPipelineOutput>('/dashboard/wip-pipeline'),
}
