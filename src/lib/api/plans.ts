import { apiClient } from '@/lib/api/client'
import type { ProductionPlan, CreatePlanInput, PlanStatus, PagedResult } from '@/types/api'

export interface PlanFilter {
  status?: PlanStatus
  search?: string
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'deadline'
  order?: 'asc' | 'desc'
}

export const plansApi = {
  list: (filter: PlanFilter = {}) =>
    apiClient.get<PagedResult<ProductionPlan>>('/plans', {
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
