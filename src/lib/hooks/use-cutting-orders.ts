import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cuttingOrdersApi, type WorkOrdersFilter } from '@/lib/api/cutting-orders'

export const WORK_ORDERS_KEY = 'work-orders'

export function useCuttingOrders(filter: WorkOrdersFilter = {}) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, filter],
    queryFn: () => cuttingOrdersApi.list(filter),
  })
}

/**
 * Kiosk-specific hook: fetches only IN_CUTTING work orders and
 * auto-refreshes every 30 seconds without causing UI flicker
 * (keepPreviousData keeps the old list visible during background refetch).
 */
export function useCuttingOrdersForKiosk() {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, { status: 'IN_CUTTING' }],
    queryFn: () => cuttingOrdersApi.list({ status: 'IN_CUTTING' }),
    refetchInterval: 30_000,
    // Keep stale data visible during background refetch → no flicker
    placeholderData: (prev) => prev,
  })
}

export function useCuttingOrder(id: string) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id],
    queryFn: () => cuttingOrdersApi.getById(id),
    enabled: !!id,
  })
}

export function useRecordCut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cuttingOrdersApi.recordCut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      queryClient.invalidateQueries({ queryKey: ['remnants'] })
    },
  })
}

