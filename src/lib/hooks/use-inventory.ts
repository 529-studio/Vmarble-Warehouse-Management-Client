import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, type PreAssignSheetInput } from '@/lib/api/inventory'

export const OVERFLOW_KEY = 'inventory-overflow-status'
export const AUDIT_LOG_KEY = 'inventory-audit-log'

/**
 * Polls `GET /inventory/overflow-status` every 30s. The hook is used both by
 * the global red banner and by every "Issue new sheet" button to gate UI.
 */
export function useOverflowStatus() {
  return useQuery({
    queryKey: [OVERFLOW_KEY],
    queryFn: inventoryApi.getOverflowStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function usePreAssignSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PreAssignSheetInput) => inventoryApi.preAssignSheet(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [OVERFLOW_KEY] })
      qc.invalidateQueries({ queryKey: ['inventory-sheets'] })
    },
  })
}

/**
 * Returns a Map<work_order_id, reason> of work orders that were created via
 * remnant bypass (BR-K05). Built from the audit-log endpoint filtered by
 * action=REMNANT_BYPASSED. Used to badge bypassed rows in the WO list.
 */
export function useRemnantBypassedWorkOrders() {
  const query = useQuery({
    queryKey: [AUDIT_LOG_KEY, 'REMNANT_BYPASSED'],
    queryFn: () => inventoryApi.listAuditLogByAction('REMNANT_BYPASSED'),
    staleTime: 60_000,
  })

  const reasonByWorkOrderId = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of query.data ?? []) {
      if (entry.entity_type !== 'WORK_ORDER') continue
      // Latest entry wins — audit log returns oldest-first, so keep overwriting.
      map.set(entry.entity_id, (entry.reason ?? '').trim())
    }
    return map
  }, [query.data])

  return { ...query, reasonByWorkOrderId }
}
