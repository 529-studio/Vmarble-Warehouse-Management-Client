import { ApiClientError, apiClient } from '@/lib/api/client'
import { normalizeAuthToken } from '@/lib/auth/token'
import type {
  CostingRecord,
  PageParams,
  PagedResult,
  WasteReportFilter,
  WasteReportRow,
} from '@/types/api'

export interface CostingFilter extends PageParams {
  finalized?: boolean
  work_order_id?: string
  /** SKU id filter — passed through to BE; FE also applies a defensive filter. */
  sku_id?: string
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `created_at`. */
  from?: string
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `created_at`. */
  to?: string
  /** Free-text search — currently scopes to WO id / SKU id substring. */
  search?: string
}

function buildApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  return new URL(`${baseUrl}${path}`, base)
}

function applyWasteReportParams(url: URL, filter: WasteReportFilter) {
  if (filter.from) url.searchParams.set('from', filter.from)
  if (filter.to) url.searchParams.set('to', filter.to)
  if (filter.material_id) url.searchParams.set('material_id', filter.material_id)
}

export const costingApi = {
  list: (filter: CostingFilter = {}) =>
    apiClient.get<PagedResult<CostingRecord>>('/costing', {
      params: {
        page: filter.page,
        limit: filter.limit,
        order: filter.order,
        finalized: filter.finalized,
        work_order_id: filter.work_order_id,
        sku_id: filter.sku_id,
        from: filter.from,
        to: filter.to,
        search: filter.search,
      },
    }),

  getByWorkOrder: (workOrderId: string) =>
    apiClient.get<CostingRecord>(`/costing/${workOrderId}`),

  compute: (workOrderId: string) =>
    apiClient.post<CostingRecord>(`/costing/${workOrderId}/compute`),

  finalize: (workOrderId: string) =>
    apiClient.post<{ status: string }>(`/costing/${workOrderId}/finalize`),

  /** GET /api/v1/costing/waste-report — JSON list of WasteReportRow */
  wasteReport: (filter: WasteReportFilter = {}) =>
    apiClient.get<WasteReportRow[]>('/costing/waste-report', {
      params: {
        from: filter.from,
        to: filter.to,
        material_id: filter.material_id,
      },
    }),

  /**
   * GET /api/v1/costing/waste-report?format=csv — returns the CSV blob.
   * Bypasses the JSON apiClient because the response body is text/csv with
   * a Content-Disposition attachment header.
   */
  wasteReportCsvBlob: async (filter: WasteReportFilter = {}): Promise<Blob> => {
    const url = buildApiUrl('/costing/waste-report')
    applyWasteReportParams(url, filter)
    url.searchParams.set('format', 'csv')

    const token =
      typeof window !== 'undefined'
        ? normalizeAuthToken(localStorage.getItem('auth_token'))
        : null

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const code: string = body?.code ?? 'UNKNOWN'
      const message: string = body?.message ?? body?.error ?? `HTTP ${response.status}`
      throw new ApiClientError(response.status, code, message, body?.details)
    }

    return response.blob()
  },
}
