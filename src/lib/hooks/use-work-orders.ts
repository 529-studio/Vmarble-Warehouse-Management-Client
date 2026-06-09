import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { workOrdersApi, type WorkOrdersFilter } from '@/lib/api/work-orders'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import type {
  CreateWOInput,
  AdvanceStatusInput,
  AssignWorkOrderInput,
  AddConsumptionInput,
  AddLaborEntryInput,
  PartialCompleteInput,
} from '@/types/api'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'

export const WORK_ORDERS_KEY = 'work-orders'
export const CONSUMPTIONS_KEY = 'consumptions'
export const LABOR_ENTRIES_KEY = 'labor-entries'

/**
 * Cursor-paginated list for the /work-orders and /cutting-dispatch pages.
 * Exposes `items`, `hasMore`, `fetchNextPage`, `total`, `totalIsEstimate`.
 */
export function useWorkOrderList(filter: Omit<WorkOrdersFilter, 'cursor'> = {}) {
  return useCursorList({
    queryKey: [WORK_ORDERS_KEY, 'list', filter],
    fetchPage: (cursor) => workOrdersApi.list({ ...filter, cursor: cursor ?? undefined }),
    staleTime: 30_000,
  })
}

/**
 * Single-page fetch for dropdown / lookup callers (e.g. limit:100, status filter).
 * Returns the raw CursorResult — callers access `.items`.
 */
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

/**
 * Maps BE 4xx codes from POST /work-orders/:id/report to friendly Vietnamese.
 *
 * BE shapes (from production swagger):
 *   400 — actual_qty out of range or shortfall_reason invalid
 *   409 — wo not in IN_PROCESSING
 */
function partialCompleteErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.status === 409) return 'Lệnh sản xuất phải đang xử lý mới có thể báo cáo hoàn thành một phần.'
    if (err.status === 400) {
      const msg = err.message?.toLowerCase() ?? ''
      if (msg.includes('actual_qty')) return 'Số lượng đạt phải nằm trong khoảng [0, kế hoạch].'
      if (msg.includes('shortfall_reason')) return 'Lý do thiếu hụt không hợp lệ.'
    }
  }
  return mapApiErrorVi(err, fallback)
}

export function usePartialCompleteWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartialCompleteInput }) =>
      workOrdersApi.partialComplete(id, input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      // Refresh costing — PARTIAL_COMPLETE freezes labor entries (BR-C04).
      queryClient.invalidateQueries({ queryKey: ['costing'] })
      const carryNo = result.carry_over_wo?.id?.slice(0, 8).toUpperCase()
      if (carryNo) {
        toast.success(`Đã báo cáo hoàn thành. Đã tạo lệnh phát sinh #${carryNo}.`)
      } else {
        toast.success('Đã báo cáo hoàn thành.')
      }
    },
    onError: (err) => {
      toast.error(partialCompleteErrorMessage(err, 'Báo cáo hoàn thành thất bại'))
    },
  })
}

export function useCheckFeasibility(id: string | null) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id, 'feasibility'],
    queryFn: () => workOrdersApi.checkFeasibility(id!),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useBoostPriority(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => workOrdersApi.boostPriority(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã đôn ưu tiên lệnh sản xuất.')
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Đôn ưu tiên thất bại')),
  })
}

export function usePreemptCandidates(id: string | null) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id, 'preempt-candidates'],
    queryFn: () => workOrdersApi.listPreemptCandidates(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function usePreempt(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from_wo_id, reason }: { from_wo_id: string; reason: string }) =>
      workOrdersApi.preempt(id, from_wo_id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
      toast.success('Đã thực hiện đôn từ lệnh khác.')
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Đôn từ WO thất bại')),
  })
}
