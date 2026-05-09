import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { costingApi, type CostingFilter } from '@/lib/api/costing'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'

export const COSTING_KEY = 'costing'

export function useCosting(filter: CostingFilter = {}) {
  return useQuery({
    queryKey: [COSTING_KEY, filter],
    queryFn: () => costingApi.list(filter),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useWorkOrderCosting(workOrderId: string | null) {
  return useQuery({
    queryKey: [COSTING_KEY, 'by-wo', workOrderId],
    queryFn: () => costingApi.getByWorkOrder(workOrderId!),
    enabled: !!workOrderId,
    staleTime: 30_000,
    retry: (failureCount, err) => {
      // 404 means no costing record yet — not a real error, stop retrying
      if (err instanceof ApiClientError && err.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useComputeCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workOrderId: string) => costingApi.compute(workOrderId),
    onSuccess: (_, workOrderId) => {
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY, 'by-wo', workOrderId] })
      toast.success('Đã tính giá thành')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Tính giá thành thất bại'))
    },
  })
}

export function useFinalizeCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workOrderId: string) => costingApi.finalize(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
      toast.success('Đã chốt giá thành')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Chốt giá thành thất bại'))
    },
  })
}
