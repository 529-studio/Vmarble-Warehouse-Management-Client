import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { containersApi, type LifecycleBody } from '@/lib/api/containers'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import type { ContainersFilter } from '@/types/api'

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
