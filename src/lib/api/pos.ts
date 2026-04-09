import { apiClient } from '@/lib/api/client'
import type { PO, CreatePOInput, LineItem, PagedResult } from '@/types/api'

export interface POFilter {
  page?: number
  limit?: number
}

export const posApi = {
  list: (filter: POFilter = {}) =>
    apiClient.get<PagedResult<PO>>('/pos', {
      params: filter as Record<string, string | number | undefined>,
    }),

  create: (input: CreatePOInput) =>
    apiClient.post<PO>('/pos', input),

  getLineItems: (poId: string) =>
    apiClient.get<LineItem[]>(`/pos/${poId}/line-items`),
}
