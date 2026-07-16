import { apiClient } from '@/lib/api/client'
import type {
  FGDefect,
  FGPool,
  FGPoolFilter,
  FGReassignHistory,
  PackingScanResult,
  PagedResult,
  ReassignFGInput,
  ReportDefectInput,
} from '@/types/api'

export const packingApi = {
  /** POST /api/v1/packing/scan — barcode → FG + suggested containers. */
  scan: (barcodeId: string) =>
    apiClient.post<PackingScanResult>('/packing/scan', { barcode_id: barcodeId }),

  /** POST /api/v1/packing/defect — flip the FG to DEFECT, log reason/photos. */
  reportDefect: (body: ReportDefectInput) =>
    apiClient.post<FGDefect>('/packing/defect', body),

  /** GET /api/v1/fg-pool — paginated FG items, filterable by sku/status/SOL. */
  fgPoolList: (filter: FGPoolFilter = {}) =>
    apiClient.get<PagedResult<FGPool>>('/fg-pool', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/fg-pool/:id — single FG item. */
  fgPoolGetById: (id: string) =>
    apiClient.get<FGPool>(`/fg-pool/${id}`),

  /** POST /api/v1/fg-pool/:id/reassign — move FG to a different SO line. */
  reassignFG: (id: string, body: ReassignFGInput) =>
    apiClient.post<FGPool>(`/fg-pool/${id}/reassign`, body),

  /** GET /api/v1/fg-pool/:id/history — reassignment audit trail. */
  fgPoolHistory: (id: string) =>
    apiClient.get<FGReassignHistory[]>(`/fg-pool/${id}/history`),
}
