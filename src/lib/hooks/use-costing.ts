import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { costingApi, type CostingFilter } from '@/lib/api/costing'
import { mapApiErrorVi } from '@/lib/api/client'

export const COSTING_KEY = 'costing'

export function useCosting(filter: CostingFilter = {}) {
  return useQuery({
    queryKey: [COSTING_KEY, filter],
    queryFn: () => costingApi.list(filter),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useComputeCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workOrderId: string) => costingApi.compute(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
      toast.success('Đã tính lại giá thành')
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
