import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { costingApi, type CostingFilter } from '@/lib/api/costing'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import type { CostingRecord, CreateAdjustmentInput } from '@/types/api'

export const COSTING_KEY = 'costing'

/**
 * Cursor-paginated costing list. Filters (excluding `cursor`) form the cache
 * key — when any filter changes the cache splits and the list naturally
 * resets to the first page.
 */
export function useCosting(
  filter: Omit<CostingFilter, 'cursor'> = {},
) {
  return useCursorList<CostingRecord>({
    queryKey: [COSTING_KEY, 'cursor', filter],
    fetchPage: (cursor) => costingApi.list({ ...filter, cursor }),
    staleTime: 60_000,
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

/**
 * Bundles record + adjustments[] + running effective totals (#178). Lazy
 * — only enabled when the dialog opens, so list rows pay no cost.
 */
export function useCostingDetail(workOrderId: string | null) {
  return useQuery({
    queryKey: [COSTING_KEY, 'detail', workOrderId],
    queryFn: () => costingApi.getDetail(workOrderId!),
    enabled: !!workOrderId,
    staleTime: 15_000,
    retry: (failureCount, err) => {
      if (err instanceof ApiClientError && err.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useCreateCostingAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workOrderId, input }: { workOrderId: string; input: CreateAdjustmentInput }) =>
      costingApi.createAdjustment(workOrderId, input),
    onSuccess: (_, { workOrderId }) => {
      // Refresh both the list (effective totals show on row) and the detail
      // panel that the dialog reads from.
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY] })
      queryClient.invalidateQueries({ queryKey: [COSTING_KEY, 'detail', workOrderId] })
      toast.success('Đã ghi nhận điều chỉnh')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Tạo điều chỉnh thất bại'))
    },
  })
}
