import type { Remnant, BoardSheet, RemnantSuggestion, StorageLocation, PagedResult, PageParams } from '@/types/api'
import { ApiClientError, apiClient } from './client'
import { normalizeAuthToken } from '@/lib/auth/token'

function buildApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  return new URL(`${baseUrl}${path}`, base).toString()
}

// ── Remnant list filters ─────────────────────────────────────────────────────

export interface RemnantsFilter extends PageParams {
  status?: string
  min_length_mm?: number
  min_width_mm?: number
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

  /** GET /api/v1/inventory/remnants/:id/label.pdf — remnant stock label PDF */
  getRemnantLabelPdfBlob: async (remnantId: string) => {
    const token =
      typeof window !== 'undefined'
        ? normalizeAuthToken(localStorage.getItem('auth_token'))
        : null

    const response = await fetch(buildApiUrl(`/inventory/remnants/${remnantId}/label.pdf`), {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
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

// ── Storage locations API ─────────────────────────────────────────────────────

export const storageLocationsApi = {
  /** GET /api/v1/storage-locations — returns active locations only */
  list: () => apiClient.get<StorageLocation[]>('/storage-locations'),
}

// ── Board sheets API ──────────────────────────────────────────────────────────

export interface SheetsFilter extends PageParams {
  status?: string
  work_order_id?: string
  material_id?: string
  lot_id?: string
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
        material_id: filter.material_id,
        lot_id: filter.lot_id,
      },
    }),
}

