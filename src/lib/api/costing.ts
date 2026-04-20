import { apiClient } from '@/lib/api/client'
import type { CostingRecord, PageParams, PagedResult } from '@/types/api'

export interface CostingFilter extends PageParams {
  finalized?: boolean
}

export const costingApi = {
  list: (filter: CostingFilter = {}) =>
    apiClient.get<PagedResult<CostingRecord>>('/costing', {
      params: {
        page: filter.page,
        limit: filter.limit,
        order: filter.order,
        finalized: filter.finalized,
      },
    }),

  getByWorkOrder: (workOrderId: string) =>
    apiClient.get<CostingRecord>(`/costing/${workOrderId}`),

  compute: (workOrderId: string) =>
    apiClient.post<CostingRecord>(`/costing/${workOrderId}/compute`),

  finalize: (workOrderId: string) =>
    apiClient.post<{ status: string }>(`/costing/${workOrderId}/finalize`),
}
