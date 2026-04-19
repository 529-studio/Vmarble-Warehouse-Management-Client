import type {
  WorkOrder,
  CreateWOInput,
  AdvanceStatusInput,
  AssignWorkOrderInput,
  SuggestAssignmentResult,
  ConsumptionRecord,
  AddConsumptionInput,
  PagedResult,
} from '@/types/api'
import { apiClient } from './client'

export interface WorkOrdersFilter {
  status?: string
  plan_id?: string
  page?: number
  limit?: number
}

export const workOrdersApi = {
  /** GET /api/v1/work-orders */
  list: (filter: WorkOrdersFilter = {}) =>
    apiClient.get<PagedResult<WorkOrder>>('/work-orders', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  /** GET /api/v1/work-orders/:id */
  getById: (id: string) => apiClient.get<WorkOrder>(`/work-orders/${id}`),

  /** POST /api/v1/work-orders */
  create: (input: CreateWOInput) =>
    apiClient.post<WorkOrder>('/work-orders', input),

  /** POST /api/v1/work-orders/:id/advance */
  advance: (id: string, input: AdvanceStatusInput) =>
    apiClient.post<WorkOrder>(`/work-orders/${id}/advance`, input),

  /** GET /api/v1/work-orders/:id/consumptions */
  listConsumptions: (id: string) =>
    apiClient.get<ConsumptionRecord[]>(`/work-orders/${id}/consumptions`),

  /** POST /api/v1/work-orders/:id/consumptions */
  addConsumption: (id: string, input: AddConsumptionInput) =>
    apiClient.post<ConsumptionRecord>(`/work-orders/${id}/consumptions`, input),

  /** POST /api/v1/work-orders/:id/assign */
  assign: (id: string, input: AssignWorkOrderInput) =>
    apiClient.post<WorkOrder>(`/work-orders/${id}/assign`, input),

  /** POST /api/v1/work-orders/:id/suggest-assignment */
  suggestAssignment: (id: string) =>
    apiClient.post<SuggestAssignmentResult>(`/work-orders/${id}/suggest-assignment`, {}),
}
