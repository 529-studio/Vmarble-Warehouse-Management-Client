import type { Remnant, WorkOrder, CostingRecord, PagedResult } from '@/types/api'
import { apiClient } from './client'

/**
 * Dashboard data — computed client-side from the real endpoints since
 * /dashboard/* routes don't exist yet in the backend.
 */
export const dashboardApi = {
  /**
   * GET /api/v1/inventory/remnants
   * Backend returns PagedResult[Remnant]; unwrap .items for the dashboard.
   */
  getRemnants: () =>
    apiClient
      .get<PagedResult<Remnant>>('/inventory/remnants', {
        params: { limit: 1000, page: 1 },
      })
      .then((res) => res.items),

  /** GET /api/v1/work-orders */
  getWorkOrders: () => apiClient.get<WorkOrder[]>('/work-orders'),

  /** GET /api/v1/costing */
  getCostingRecords: () => apiClient.get<CostingRecord[]>('/costing'),
}
