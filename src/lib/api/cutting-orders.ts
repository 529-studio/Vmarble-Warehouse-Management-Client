import type {
  WorkOrder,
  RecordCutInput,
  RecordCutResponse,
  PaginatedResponse,
} from '@/types/api'
import { apiClient } from './client'

export interface WorkOrdersFilter {
  status?: string
  planId?: string
  page?: number
  pageSize?: number
}

export const cuttingOrdersApi = {
  list: (filter: WorkOrdersFilter = {}) =>
    apiClient.get<PaginatedResponse<WorkOrder>>('/work-orders', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  getById: (id: string) => apiClient.get<WorkOrder>(`/work-orders/${id}`),

  recordCut: (input: RecordCutInput) =>
    apiClient.post<RecordCutResponse>('/inventory/record-cut', input),
}
