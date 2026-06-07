import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  containersApi,
  type AddLineInput,
  type LifecycleBody,
  type TransferLineInput,
} from '@/lib/api/containers'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import type { AssignLoaderInput, ContainersFilter } from '@/types/api'
import { SALES_ORDERS_KEY } from '@/lib/hooks/use-sales-orders'

export const CONTAINERS_KEY = 'containers'

export function useContainers(filter: ContainersFilter = {}) {
  return useQuery({
    queryKey: [CONTAINERS_KEY, filter],
    queryFn: () => containersApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useContainer(id: string | null) {
  return useQuery({
    queryKey: [CONTAINERS_KEY, 'detail', id],
    queryFn: () => containersApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

/**
 * Maps BE 409 ErrInvalidTransition to a Vietnamese sentence. The BE shape is:
 *   { "error": "only SEALED containers can be shipped; got OPEN" }
 * We surface a friendly message and let the caller snap the kanban back.
 */
function lifecycleErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.status === 409) return 'Trạng thái container không cho phép thao tác này.'
    if (err.status === 400 && err.message?.toLowerCase().includes('reason'))
      return 'Cần nhập lý do để mở lại container.'
  }
  return mapApiErrorVi(err, fallback)
}

interface LifecycleArgs {
  id: string
  body?: LifecycleBody
}

export function useSealContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: LifecycleArgs) => containersApi.seal(id, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã niêm phong container')
    },
    onError: (err) => toast.error(lifecycleErrorMessage(err, 'Niêm phong thất bại')),
  })
}

export function useShipContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: LifecycleArgs) => containersApi.ship(id, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã ghi nhận container xuất tàu')
    },
    onError: (err) => toast.error(lifecycleErrorMessage(err, 'Xác nhận xuất tàu thất bại')),
  })
}

export function useReopenContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { reason: string; note?: string } }) =>
      containersApi.reopen(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã mở lại container')
    },
    onError: (err) => toast.error(lifecycleErrorMessage(err, 'Mở lại container thất bại')),
  })
}

export function useCancelContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: LifecycleArgs) => containersApi.cancel(id, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã huỷ container')
    },
    onError: (err) => toast.error(lifecycleErrorMessage(err, 'Huỷ container thất bại')),
  })
}

/**
 * Maps line-edit failures to friendly Vietnamese. The two BE error paths we
 * surface specifically are 409 (container not in OPEN/LOADING) and 400 with
 * an "exceeds" message (qty > qty_ordered). Everything else falls through to
 * the generic mapApiErrorVi.
 */
function lineErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.status === 409)
      return 'Container không ở trạng thái cho phép chỉnh sửa dòng hàng.'
    if (err.status === 400 && err.message?.toLowerCase().includes('exceed'))
      return 'Số lượng vượt quá số lượng còn lại của dòng SO.'
    if (err.status === 422)
      return 'Vượt quá sức chứa container. Admin có thể tick "Force add" để bỏ qua giới hạn.'
  }
  return mapApiErrorVi(err, fallback)
}

export function useAddContainerLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AddLineInput }) =>
      containersApi.addLine(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      qc.invalidateQueries({ queryKey: [SALES_ORDERS_KEY] })
      toast.success('Đã thêm dòng hàng vào container')
    },
    onError: (err) => toast.error(lineErrorMessage(err, 'Thêm dòng hàng thất bại')),
  })
}

export function useRemoveContainerLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lineId }: { id: string; lineId: string }) =>
      containersApi.removeLine(id, lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      qc.invalidateQueries({ queryKey: [SALES_ORDERS_KEY] })
      toast.success('Đã xoá dòng hàng')
    },
    onError: (err) => toast.error(lineErrorMessage(err, 'Xoá dòng hàng thất bại')),
  })
}

export function useTransferContainerLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransferLineInput }) =>
      containersApi.transferLine(id, body),
    onSuccess: () => {
      // Both source + target containers change; sweep the prefix.
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã chuyển dòng hàng')
    },
    onError: (err) => toast.error(lineErrorMessage(err, 'Chuyển dòng hàng thất bại')),
  })
}

export const AT_RISK_KEY = 'containers-at-risk'

export function useAtRisk(days = 7) {
  return useQuery({
    queryKey: [AT_RISK_KEY, days],
    queryFn: () => containersApi.getAtRisk(days),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export const LOADER_LOG_KEY = 'container-loader-log'

export function useContainerLoaderLog(id: string | null) {
  return useQuery({
    queryKey: [LOADER_LOG_KEY, id],
    queryFn: () => containersApi.getLoaderLog(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useAssignLoader(containerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignLoaderInput) => containersApi.assignLoader(containerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      qc.invalidateQueries({ queryKey: [LOADER_LOG_KEY, containerId] })
      toast.success('Đã cập nhật người xếp hàng')
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 400) {
        toast.error('Cần nhập lý do khi thay đổi người xếp hàng.')
      } else {
        toast.error(mapApiErrorVi(err, 'Cập nhật người xếp hàng thất bại'))
      }
    },
  })
}

export function useDownloadPackingList(containerId: string) {
  return useMutation({
    mutationFn: () => containersApi.downloadPackingList(containerId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `packing-list-${containerId}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 412) {
        toast.error('Container chưa được niêm phong. Chỉ tải được packing list khi SEALED.')
      } else {
        toast.error(mapApiErrorVi(err, 'Tải packing list thất bại'))
      }
    },
  })
}
