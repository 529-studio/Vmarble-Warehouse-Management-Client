import { apiClient } from '@/lib/api/client'
import type {
  ApproveLoadingExceptionInput,
  BulkApproveLoadingExceptionsInput,
  BulkApproveResult,
  CreateLoadingExceptionInput,
  CursorResult,
  LoadingException,
  LoadingExceptionsSummary,
  RejectLoadingExceptionInput,
} from '@/types/api'

export interface ListExceptionsFilter {
  /** pending | approved | all (default all) */
  status?: 'pending' | 'approved' | 'all'
  cursor?: string
  limit?: number
}

/** Cross-container queue filter — superset of `ListExceptionsFilter` (#328). */
export interface ListGlobalExceptionsFilter {
  /** pending | approved | rejected | all (default all) */
  status?: 'pending' | 'approved' | 'rejected' | 'all'
  container_id?: string
  customer_id?: string
  exception_type?: string
  /** RFC3339 lower bound on created_at (inclusive). */
  from?: string
  /** RFC3339 upper bound on created_at (exclusive). */
  to?: string
  cursor?: string
  /** Default 50, max 200 per BE. */
  limit?: number
}

export type SummaryFilter = Omit<ListGlobalExceptionsFilter, 'status' | 'cursor' | 'limit'>

export const loadingExceptionsApi = {
  /** GET /api/v1/containers/:id/exceptions — keyset paginated. */
  listByContainer: (containerId: string, filter: ListExceptionsFilter = {}) =>
    apiClient.get<CursorResult<LoadingException>>(
      `/containers/${containerId}/exceptions`,
      { params: filter as Record<string, string | number | undefined> },
    ),

  /** GET /api/v1/loading-exceptions — global cross-container queue. */
  listGlobal: (filter: ListGlobalExceptionsFilter = {}) =>
    apiClient.get<CursorResult<LoadingException>>('/loading-exceptions', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/loading-exceptions/summary — pinned counter. */
  getSummary: (filter: SummaryFilter = {}) =>
    apiClient.get<LoadingExceptionsSummary>('/loading-exceptions/summary', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** POST /api/v1/containers/:id/exceptions — raise an exception. */
  create: (containerId: string, body: CreateLoadingExceptionInput) =>
    apiClient.post<LoadingException>(`/containers/${containerId}/exceptions`, body),

  /** GET /api/v1/loading-exceptions/:id — single record. */
  getById: (id: string) =>
    apiClient.get<LoadingException>(`/loading-exceptions/${id}`),

  /** PATCH /api/v1/loading-exceptions/:id/approve — admin/sales action. */
  approve: (id: string, body: ApproveLoadingExceptionInput) =>
    apiClient.patch<LoadingException>(
      `/loading-exceptions/${id}/approve`,
      body,
    ),

  /** PATCH /api/v1/loading-exceptions/:id/reject — close without resolution. */
  reject: (id: string, body: RejectLoadingExceptionInput) =>
    apiClient.patch<LoadingException>(`/loading-exceptions/${id}/reject`, body),

  /**
   * POST /api/v1/loading-exceptions/bulk-approve — up to 50 ids in one batch.
   * Returns partial-success: every id lands in `approved` or `failed`.
   * BACKORDER and SUBSTITUTE_ACCEPTED are not allowed via bulk because they
   * require per-row context.
   */
  bulkApprove: (body: BulkApproveLoadingExceptionsInput) =>
    apiClient.post<BulkApproveResult>('/loading-exceptions/bulk-approve', body),
}
