import { apiClient } from '@/lib/api/client'
import type { PO, CreatePOInput, LineItem, CursorResult } from '@/types/api'

export interface POFilter {
  limit?: number
  cursor?: string
  /** Free-text search — BE matches against PO `code` (and notes when present). */
  search?: string
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `created_at`. */
  from?: string
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `created_at`. */
  to?: string
}

export const posApi = {
  list: (filter: POFilter = {}) =>
    apiClient.get<CursorResult<PO>>('/pos', {
      params: filter as Record<string, string | number | undefined>,
    }),

  create: (input: CreatePOInput) =>
    apiClient.post<PO>('/pos', input),

  getLineItems: (poId: string) =>
    apiClient.get<LineItem[]>(`/pos/${poId}/line-items`),
}
