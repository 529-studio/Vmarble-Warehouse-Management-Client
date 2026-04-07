import type { Remnant, CostingRecord, PagedResult, PageParams } from '@/types/api'
import { apiClient } from './client'

// ── Remnant list filters ─────────────────────────────────────────────────────

export interface RemnantsFilter extends PageParams {
  status?: string
  min_length_mm?: number
  min_width_mm?: number
}

export interface CostingFilter extends PageParams {
  finalized?: boolean
}

// ── Remnants API ──────────────────────────────────────────────────────────────

export const remnantsApi = {
  /**
   * GET /api/v1/inventory/remnants
   * Returns a paged result with metadata.
   */
  list: (filter: RemnantsFilter = {}) =>
    apiClient.get<PagedResult<Remnant>>('/inventory/remnants', {
      params: {
        page: filter.page,
        limit: filter.limit,
        search: filter.search,
        sort_by: filter.sort_by,
        order: filter.order,
        status: filter.status,
        min_length_mm: filter.min_length_mm,
        min_width_mm: filter.min_width_mm,
      },
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

// ── Costing API ──────────────────────────────────────────────────────────────

export const costingApi = {
  /**
   * GET /api/v1/costing
   * Returns a paged result with metadata.
   */
  list: (filter: CostingFilter = {}) =>
    apiClient.get<PagedResult<CostingRecord>>('/costing', {
      params: {
        page: filter.page,
        limit: filter.limit,
        order: filter.order,
        finalized: filter.finalized,
      },
    }),

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
