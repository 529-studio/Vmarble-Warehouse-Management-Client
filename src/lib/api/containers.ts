import { apiClient } from '@/lib/api/client'
import type {
  Container,
  ContainersFilter,
  PagedResult,
} from '@/types/api'

export interface LifecycleBody {
  /** Note recorded on the audit row. Optional for seal/ship/cancel. */
  note?: string
  /** Required for reopen (BR-D06). Empty string → BE rejects with 400. */
  reason?: string
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
}
