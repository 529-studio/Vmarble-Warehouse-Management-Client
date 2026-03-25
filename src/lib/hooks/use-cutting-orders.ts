import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cuttingOrdersApi, type WorkOrdersFilter } from '@/lib/api/cutting-orders'

export const WORK_ORDERS_KEY = 'work-orders'

export function useCuttingOrders(filter: WorkOrdersFilter = {}) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, filter],
    queryFn: () => cuttingOrdersApi.list(filter),
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
