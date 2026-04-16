import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { workOrdersApi, type WorkOrdersFilter } from '@/lib/api/work-orders'
import type { CreateWOInput, AdvanceStatusInput, AssignWorkOrderInput } from '@/types/api'
import { mapApiErrorVi } from '@/lib/api/client'

export const WORK_ORDERS_KEY = 'work-orders'
export const CONSUMPTIONS_KEY = 'consumptions'

export function useWorkOrders(filter: WorkOrdersFilter = {}) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, filter],
    queryFn: () => workOrdersApi.list(filter),
    placeholderData: (prev) => prev,
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id],
    queryFn: () => workOrdersApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWOInput) => workOrdersApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã tạo lệnh sản xuất')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Tạo lệnh thất bại'))
    },
  })
}

export function useAdvanceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdvanceStatusInput }) =>
      workOrdersApi.advance(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã cập nhật trạng thái')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Cập nhật trạng thái thất bại'))
    },
  })
}

export function useWorkOrderConsumptions(workOrderId: string) {
  return useQuery({
    queryKey: [CONSUMPTIONS_KEY, workOrderId],
    queryFn: () => workOrdersApi.listConsumptions(workOrderId),
    enabled: !!workOrderId,
  })
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignWorkOrderInput }) =>
      workOrdersApi.assign(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã phân công')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Phân công thất bại'))
    },
  })
}
