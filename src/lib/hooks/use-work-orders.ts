import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { workOrdersApi, type WorkOrdersFilter } from '@/lib/api/work-orders'
import type {
  CreateWOInput,
  AdvanceStatusInput,
  AssignWorkOrderInput,
  AddConsumptionInput,
  AddLaborEntryInput,
} from '@/types/api'
import { mapApiErrorVi } from '@/lib/api/client'

export const WORK_ORDERS_KEY = 'work-orders'
export const CONSUMPTIONS_KEY = 'consumptions'
export const LABOR_ENTRIES_KEY = 'labor-entries'

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
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      // Refresh REMNANT_BYPASSED audit feed so the new badge shows up immediately.
      if (input.bypass_reason) {
        queryClient.invalidateQueries({ queryKey: ['inventory-audit-log', 'REMNANT_BYPASSED'] })
      }
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

export function useAddWorkOrderConsumption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workOrderId,
      input,
    }: {
      workOrderId: string
      input: AddConsumptionInput
    }) => workOrdersApi.addConsumption(workOrderId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONSUMPTIONS_KEY, variables.workOrderId] })
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, variables.workOrderId] })
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã ghi nhận vật tư tiêu thụ')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Ghi nhận vật tư tiêu thụ thất bại'))
    },
  })
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignWorkOrderInput }) =>
      workOrdersApi.assign(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      // Caller owns the success toast so it can include the WO id + worker
      // name (#187). Default error toast still applies if the caller does not
      // override it.
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Phân công thất bại'))
    },
  })
}

export function useSuggestAssignment() {
  return useMutation({
    mutationFn: (woId: string) => workOrdersApi.suggestAssignment(woId),
  })
}

export function useWorkOrderLaborEntries(workOrderId: string) {
  return useQuery({
    queryKey: [LABOR_ENTRIES_KEY, workOrderId],
    queryFn: () => workOrdersApi.listLaborEntries(workOrderId),
    enabled: !!workOrderId,
  })
}

export function useAddLaborEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workOrderId,
      input,
    }: {
      workOrderId: string
      input: AddLaborEntryInput
    }) => workOrdersApi.addLaborEntry(workOrderId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [LABOR_ENTRIES_KEY, variables.workOrderId] })
      // Labor cost is part of the costing record — refresh so the WO detail
      // page reflects the new total once costing is recomputed.
      queryClient.invalidateQueries({ queryKey: ['costing'] })
      toast.success('Đã ghi nhận công lao động')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Ghi nhận công lao động thất bại'))
    },
  })
}
