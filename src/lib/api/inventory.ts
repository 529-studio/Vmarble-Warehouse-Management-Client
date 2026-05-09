import type { OverflowStatus } from '@/types/api'
import { apiClient } from './client'

export interface PreAssignSheetInput {
  sheetId: string
  workOrderId: string
  /** Set true with a non-empty reason to bypass overflow lock (admin only) */
  force?: boolean
  reason?: string
}

export const inventoryApi = {
  /** GET /api/v1/inventory/overflow-status */
  getOverflowStatus: () => apiClient.get<OverflowStatus>('/inventory/overflow-status'),

  /**
   * POST /api/v1/inventory/sheets/{id}/pre-assign?force=true&reason=...
   * Reserves a board sheet for a work order. Returns 412 when overflow is RED
   * and `force` is not set; admin can bypass by passing force + reason.
   */
  preAssignSheet: ({ sheetId, workOrderId, force, reason }: PreAssignSheetInput) =>
    apiClient.post<void>(
      `/inventory/sheets/${sheetId}/pre-assign`,
      { work_order_id: workOrderId },
      {
        params: {
          force: force ? 'true' : undefined,
          reason: reason && reason.length > 0 ? reason : undefined,
        },
      },
    ),
}
