import { apiClient } from '@/lib/api/client'
import type { ProductionPlan, CreatePlanInput, PlanStatus, CursorResult } from '@/types/api'

export interface PlanFilter {
  status?: PlanStatus
  search?: string
  limit?: number
  cursor?: string
  /** PO id filter — narrows the plan list to a single PO. */
  po_id?: string
  /** SKU id filter — narrows to plans that contain at least one row of this SKU. */
  sku_id?: string
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `created_at`. */
  from?: string
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `created_at`. */
  to?: string
}

export const plansApi = {
  list: (filter: PlanFilter = {}) =>
    apiClient.get<CursorResult<ProductionPlan>>('/plans', {
      params: filter as Record<string, string | number | undefined>,
    }),

  getById: (id: string) =>
    apiClient.get<ProductionPlan>(`/plans/${id}`),

  create: (input: CreatePlanInput) =>
    apiClient.post<ProductionPlan>('/plans', input),

  approve: (id: string) =>
    apiClient.post<ProductionPlan>(`/plans/${id}/approve`, {}),

  cancel: (id: string) =>
    apiClient.post<ProductionPlan>(`/plans/${id}/cancel`, {}),
}
