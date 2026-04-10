import type { WorkOrder, RecordCutInput, RecordCutResponse, PagedResult } from '@/types/api'
import { apiClient } from './client'

export interface WorkOrdersFilter {
  status?: string
  plan_id?: string
  page?: number
  pageSize?: number
}

export const cuttingOrdersApi = {
  /** GET /api/v1/work-orders — returns paged result */
  list: (filter: WorkOrdersFilter = {}) =>
    apiClient.get<PagedResult<WorkOrder>>('/work-orders', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  /** GET /api/v1/work-orders/{id} */
  getById: (id: string) => apiClient.get<WorkOrder>(`/work-orders/${id}`),

  /** POST /api/v1/inventory/cuts */
  recordCut: (input: RecordCutInput) =>
    apiClient.post<RecordCutResponse>('/inventory/cuts', input),
}
