import { apiClient } from '@/lib/api/client'
import type { Material, CreateMaterialInput, PagedResult } from '@/types/api'

export interface MaterialFilter {
  page?: number
  limit?: number
  search?: string
}

export const materialsApi = {
  list: (filter: MaterialFilter = {}) =>
    apiClient.get<PagedResult<Material>>('/materials', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  create: (input: CreateMaterialInput) =>
    apiClient.post<Material>('/materials', input),
}
