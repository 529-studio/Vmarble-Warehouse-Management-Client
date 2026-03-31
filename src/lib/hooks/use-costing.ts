import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { costingApi, type CostingFilter } from '@/lib/api/remnants'

export const COSTING_KEY = 'costing'

export function useCosting(filter: CostingFilter = {}) {
  return useQuery({
    queryKey: [COSTING_KEY, filter],
    queryFn: () => costingApi.list(filter),
    staleTime: 60_000,
    // Keep previous page data visible while the next page loads
    placeholderData: (prev) => prev,
  })
}

export function useComputeCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workOrderId: string) => costingApi.compute(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
    },
  })
}

export function useFinalizeCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workOrderId: string) => costingApi.finalize(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
    },
  })
}
