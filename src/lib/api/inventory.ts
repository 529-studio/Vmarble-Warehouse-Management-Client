import type { AuditLogAction, AuditLogEntry, CursorResult, OverflowStatus } from '@/types/api'
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

  /**
   * GET /api/v1/inventory/audit-log?action=REMNANT_BYPASSED
   * BE returns the cursor envelope; this caller only needs to badge bypassed
   * WOs in the visible list, so we fetch the first page (limit=100) and
   * surface a flat array. Migrate to useCursorList when the audit-log gets
   * its own viewer page.
   */
  listAuditLogByAction: async (action: AuditLogAction): Promise<AuditLogEntry[]> => {
    const res = await apiClient.get<CursorResult<AuditLogEntry>>('/inventory/audit-log', {
      params: { action, limit: 100 },
    })
    return res.items
  },
}
