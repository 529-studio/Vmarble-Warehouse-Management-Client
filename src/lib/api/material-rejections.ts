import { apiClient } from '@/lib/api/client'
import type {
  CursorResult,
  MaterialRejection,
  MaterialRejectionsFilter,
  UpdateClaimInput,
} from '@/types/api'

export const materialRejectionsApi = {
  /** GET /api/v1/inventory/material-rejections — keyset paginated. */
  list: (filter: MaterialRejectionsFilter = {}) =>
    apiClient.get<CursorResult<MaterialRejection>>(
      '/inventory/material-rejections',
      {
        params: {
          cursor: filter.cursor ?? undefined,
          limit: filter.limit,
          claim_status: filter.claim_status,
          lot_id: filter.lot_id,
        },
      },
    ),

  /** GET /api/v1/inventory/material-rejections/:id */
  getById: (id: string) =>
    apiClient.get<MaterialRejection>(`/inventory/material-rejections/${id}`),

  /**
   * PATCH /api/v1/inventory/material-rejections/:id — BR-INV05 transitions:
   *   OPEN → APPROVED | REJECTED, APPROVED → PAID. Anything else returns 409.
   */
  updateClaim: (id: string, input: UpdateClaimInput) =>
    apiClient.patch<MaterialRejection>(
      `/inventory/material-rejections/${id}`,
      input,
    ),
}
