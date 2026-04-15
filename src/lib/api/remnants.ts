import type { Remnant, BoardSheet, CostingRecord, RemnantSuggestion, StorageLocation, PagedResult, PageParams } from '@/types/api'
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

  /** GET /api/v1/inventory/remnants/{id} */
  getById: (remnantId: string) =>
    apiClient.get<Remnant>(`/inventory/remnants/${remnantId}`),

  /** POST /api/v1/inventory/remnants/{id}/stock */
  stock: (remnantId: string, locationBarcode: string) =>
    apiClient.post<{ status: string }>(`/inventory/remnants/${remnantId}/stock`, {
      location_barcode: locationBarcode,
    }),

  /**
   * GET /api/v1/inventory/remnants/suggestions?length_mm=X&width_mm=Y&limit=N
   * Returns up to `limit` AVAILABLE remnants ranked by Best Fit + FIFO.
   * Each suggestion includes the remnant's storage location when stocked.
   */
  suggest: (lengthMm: number, widthMm: number, limit = 3) =>
    apiClient.get<RemnantSuggestion[]>('/inventory/remnants/suggestions', {
      params: { length_mm: lengthMm, width_mm: widthMm, limit },
    }),
}

// ── Storage locations API ─────────────────────────────────────────────────────

export const storageLocationsApi = {
  /** GET /api/v1/storage-locations — returns active locations only */
  list: () => apiClient.get<StorageLocation[]>('/storage-locations'),
}

// ── Board sheets API ──────────────────────────────────────────────────────────

export interface SheetsFilter extends PageParams {
  status?: string
  work_order_id?: string
}

export const sheetsApi = {
  /**
   * GET /api/v1/inventory/sheets
   * Returns a paged result of board sheets.
   */
  list: (filter: SheetsFilter = {}) =>
    apiClient.get<PagedResult<BoardSheet>>('/inventory/sheets', {
      params: {
        page: filter.page,
        limit: filter.limit,
        status: filter.status,
        work_order_id: filter.work_order_id,
      },
    }),
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
