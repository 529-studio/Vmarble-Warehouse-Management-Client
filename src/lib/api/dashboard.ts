import type { Remnant, WorkOrder, CostingRecord } from '@/types/api'
import { apiClient } from './client'

/**
 * Dashboard data — computed client-side from the real endpoints since
 * /dashboard/* routes don't exist yet in the backend.
 */
export const dashboardApi = {
  /** GET /api/v1/inventory/remnants */
  getRemnants: () => apiClient.get<Remnant[]>('/inventory/remnants'),

  /** GET /api/v1/work-orders */
  getWorkOrders: () => apiClient.get<WorkOrder[]>('/work-orders'),

  /** GET /api/v1/costing */
  getCostingRecords: () => apiClient.get<CostingRecord[]>('/costing'),
}
