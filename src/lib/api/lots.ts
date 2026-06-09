import { apiClient } from '@/lib/api/client'
import type { InventoryLot, CursorResult } from '@/types/api'

export interface LotsFilter {
  cursor?: string
  limit?: number
  material_id?: string
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `received_at`. */
  from?: string
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `received_at`. */
  to?: string
}

export const lotsApi = {
  /** GET /api/v1/inventory/lots */
  list: (filter: LotsFilter = {}) =>
    apiClient.get<CursorResult<InventoryLot>>('/inventory/lots', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/inventory/lots/:id */
  getById: (id: string) =>
    apiClient.get<InventoryLot>(`/inventory/lots/${id}`),
}
