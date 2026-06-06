import { apiClient } from '@/lib/api/client'
import type {
  AtRiskRow,
  Container,
  ContainerLine,
  ContainersFilter,
  PagedResult,
} from '@/types/api'

export interface LifecycleBody {
  /** Note recorded on the audit row. Optional for seal/ship/cancel. */
  note?: string
  /** Required for reopen (BR-D06). Empty string → BE rejects with 400. */
  reason?: string
}

/** Body for POST /containers/:id/lines (BE `delivery.AddLineInput`). */
export interface AddLineInput {
  sales_order_line_id: string
  sku_id: string
  qty: number
  /** CBM is supplied by the caller — BE does not derive from SKU dims. */
  cbm_total: number
  weight_kg_total: number
  /** Admin-only override: bypass the 422 capacity guard. */
  allow_overload?: boolean
}

/** Body for POST /containers/:id/transfer-line (BE `delivery.TransferLineInput`). */
export interface TransferLineInput {
  line_id: string
  target_container_id: string
  qty: number
  cbm_total: number
  weight_kg_total: number
}

/** BE returns both source (nil if fully consumed) and target lines after transfer. */
export interface TransferLineResult {
  source_line: ContainerLine | null
  target_line: ContainerLine
}

export const containersApi = {
  /** GET /api/v1/containers — paginated list (no `lines` hydrated). */
  list: (filter: ContainersFilter = {}) =>
    apiClient.get<PagedResult<Container>>('/containers', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/containers/:id — full record incl. `lines`. */
  getById: (id: string) =>
    apiClient.get<Container>(`/containers/${id}`),

  /** POST /api/v1/containers/:id/seal — OPEN/LOADING → SEALED. */
  seal: (id: string, body: LifecycleBody = {}) =>
    apiClient.post<Container>(`/containers/${id}/seal`, body),

  /** POST /api/v1/containers/:id/ship — SEALED → SHIPPED. */
  ship: (id: string, body: LifecycleBody = {}) =>
    apiClient.post<Container>(`/containers/${id}/ship`, body),

  /**
   * POST /api/v1/containers/:id/reopen — SEALED → LOADING.
   * Admin-only; BR-D06 requires non-empty `reason`.
   */
  reopen: (id: string, body: { reason: string; note?: string }) =>
    apiClient.post<Container>(`/containers/${id}/reopen`, body),

  /** POST /api/v1/containers/:id/cancel — OPEN/LOADING → CANCELLED. */
  cancel: (id: string, body: LifecycleBody = {}) =>
    apiClient.post<Container>(`/containers/${id}/cancel`, body),

  /** POST /api/v1/containers/:id/lines — add a finished-goods line. */
  addLine: (id: string, body: AddLineInput) =>
    apiClient.post<ContainerLine>(`/containers/${id}/lines`, body),

  /** DELETE /api/v1/containers/:id/lines/:line_id — remove a line. */
  removeLine: (id: string, lineId: string) =>
    apiClient.delete<void>(`/containers/${id}/lines/${lineId}`),

  /** POST /api/v1/containers/:id/transfer-line — full or partial transfer. */
  transferLine: (id: string, body: TransferLineInput) =>
    apiClient.post<TransferLineResult>(`/containers/${id}/transfer-line`, body),

  /** GET /api/v1/containers/at-risk?days=N — OPEN/LOADING containers near cutoff. */
  getAtRisk: (days = 7) =>
    apiClient.get<AtRiskRow[]>('/containers/at-risk', { params: { days } }),
}
