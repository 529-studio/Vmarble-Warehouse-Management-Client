import type { Remnant, CostingRecord } from '@/types/api'
import { apiClient } from './client'

// ── Remnant list filters ─────────────────────────────────────────────────────

export interface RemnantsFilter {
  status?: string
  page?: number
  pageSize?: number
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const remnantsApi = {
  /** GET /api/v1/inventory/remnants — returns array (not paginated) */
  list: (filter: RemnantsFilter = {}) =>
    apiClient.get<Remnant[]>('/inventory/remnants', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  /** POST /api/v1/inventory/remnants/{id}/allocate */
  allocate: (remnantId: string, workOrderId: string) =>
    apiClient.post<void>(`/inventory/remnants/${remnantId}/allocate`, {
      work_order_id: workOrderId,
    }),

  /** POST /api/v1/inventory/remnants/{id}/waste */
  markWaste: (remnantId: string) =>
    apiClient.post<void>(`/inventory/remnants/${remnantId}/waste`),
}

// ── Costing ─────────────────────────────────────────────────────────────────

export const costingApi = {
  /** GET /api/v1/costing — all costing records */
  list: () => apiClient.get<CostingRecord[]>('/costing'),

  /** GET /api/v1/costing/{workOrderID} */
  getByWorkOrder: (workOrderId: string) =>
    apiClient.get<CostingRecord>(`/costing/${workOrderId}`),

  /** POST /api/v1/costing/{workOrderID}/compute */
  compute: (workOrderId: string) =>
    apiClient.post<CostingRecord>(`/costing/${workOrderId}/compute`),

  /** POST /api/v1/costing/{workOrderID}/finalize */
  finalize: (workOrderId: string) =>
    apiClient.post<void>(`/costing/${workOrderId}/finalize`),
}
