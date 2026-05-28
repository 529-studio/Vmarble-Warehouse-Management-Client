import { apiClient } from '@/lib/api/client'
import type {
  ApproveLoadingExceptionInput,
  CreateLoadingExceptionInput,
  CursorResult,
  LoadingException,
  RejectLoadingExceptionInput,
} from '@/types/api'

export interface ListExceptionsFilter {
  /** pending | approved | all (default all) */
  status?: 'pending' | 'approved' | 'all'
  cursor?: string
  limit?: number
}

export const loadingExceptionsApi = {
  /** GET /api/v1/containers/:id/exceptions — keyset paginated. */
  listByContainer: (containerId: string, filter: ListExceptionsFilter = {}) =>
    apiClient.get<CursorResult<LoadingException>>(
      `/containers/${containerId}/exceptions`,
      { params: filter as Record<string, string | number | undefined> },
    ),

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
}
