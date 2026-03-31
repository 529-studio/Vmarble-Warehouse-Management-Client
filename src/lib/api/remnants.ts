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

function toPagedResult<T>(
  items: T[],
  page: number,
  limit: number,
): PagedResult<T> {
  const safeLimit = Math.max(1, limit)
  const safePage = Math.max(1, page)
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit))
  const start = (safePage - 1) * safeLimit
  const pagedItems = items.slice(start, start + safeLimit)

  return {
    items: pagedItems,
    total_items: totalItems,
    total_pages: totalPages,
    current_page: safePage,
    limit: safeLimit,
  }
}

function isPagedResult<T>(data: unknown): data is PagedResult<T> {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'items' in data &&
      'total_items' in data &&
      'total_pages' in data &&
      'current_page' in data &&
      'limit' in data,
  )
}

function normalizeRemnantListResponse(
  data: unknown,
  filter: RemnantsFilter,
): PagedResult<Remnant> {
  if (isPagedResult<Remnant>(data)) return data

  const page = filter.page ?? 1
  const limit = filter.limit ?? 10
  const search = filter.search?.trim().toLowerCase()

  const list = Array.isArray(data) ? (data as Remnant[]) : []
  const filtered = list.filter((item) => {
    if (filter.status && item.status !== filter.status) return false
    if (search) {
      const id = item.id.toLowerCase()
      const dimensions = `${item.dimensions.length_mm}x${item.dimensions.width_mm}`
      if (!id.includes(search) && !dimensions.includes(search)) return false
    }
    return true
  })

  return toPagedResult(filtered, page, limit)
}

function normalizeCostingListResponse(
  data: unknown,
  filter: CostingFilter,
): PagedResult<CostingRecord> {
  if (isPagedResult<CostingRecord>(data)) return data

  const page = filter.page ?? 1
  const limit = filter.limit ?? 10
  const search = filter.search?.trim().toLowerCase()

  const list = Array.isArray(data) ? (data as CostingRecord[]) : []
  const filtered = list.filter((item) => {
    if (filter.finalized !== undefined && item.finalized !== filter.finalized) return false
    if (search) {
      const wo = item.work_order_id.toLowerCase()
      const sku = item.sku_id.toLowerCase()
      if (!wo.includes(search) && !sku.includes(search)) return false
    }
    return true
  })

  return toPagedResult(filtered, page, limit)
}

// ── Remnants API ──────────────────────────────────────────────────────────────

export const remnantsApi = {
  /**
   * GET /api/v1/inventory/remnants
   * Returns a paged result with metadata.
   */
  list: async (filter: RemnantsFilter = {}) => {
    const data = await apiClient.get<PagedResult<Remnant> | Remnant[]>(
      '/inventory/remnants',
      {
        params: {
          min_length_mm: filter.min_length_mm,
          min_width_mm: filter.min_width_mm,
        },
      },
    )
    return normalizeRemnantListResponse(data, filter)
  },

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
  list: async (filter: CostingFilter = {}) => {
    const data = await apiClient.get<PagedResult<CostingRecord> | CostingRecord[]>(
      '/costing',
    )
    return normalizeCostingListResponse(data, filter)
  },

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
