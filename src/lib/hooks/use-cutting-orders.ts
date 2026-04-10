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
 * (placeholderData keeps the old list visible during background refetch).
 * Returns the items array directly so the page can call .map() safely.
 */
export function useCuttingOrdersForKiosk() {
  const query = useQuery({
    queryKey: [WORK_ORDERS_KEY, { status: 'IN_CUTTING' }],
    queryFn: () => cuttingOrdersApi.list({ status: 'IN_CUTTING' }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  })
  return {
    ...query,
    data: query.data?.items ?? [],
  }
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

