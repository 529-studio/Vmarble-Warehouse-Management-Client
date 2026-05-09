import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, type PreAssignSheetInput } from '@/lib/api/inventory'

export const OVERFLOW_KEY = 'inventory-overflow-status'

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
