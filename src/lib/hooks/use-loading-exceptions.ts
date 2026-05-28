import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  loadingExceptionsApi,
  type ListExceptionsFilter,
} from '@/lib/api/loading-exceptions'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import type {
  ApproveLoadingExceptionInput,
  CreateLoadingExceptionInput,
  RejectLoadingExceptionInput,
} from '@/types/api'
import { CONTAINERS_KEY } from '@/lib/hooks/use-containers'

export const LOADING_EXCEPTIONS_KEY = 'loading-exceptions'

export function useContainerExceptions(
  containerId: string | null,
  filter: ListExceptionsFilter = {},
) {
  return useQuery({
    queryKey: [LOADING_EXCEPTIONS_KEY, 'by-container', containerId, filter],
    queryFn: () => loadingExceptionsApi.listByContainer(containerId!, filter),
    enabled: !!containerId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useLoadingException(id: string | null) {
  return useQuery({
    queryKey: [LOADING_EXCEPTIONS_KEY, 'detail', id],
    queryFn: () => loadingExceptionsApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

interface CreateArgs {
  containerId: string
  body: CreateLoadingExceptionInput
}

export function useCreateLoadingException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ containerId, body }: CreateArgs) =>
      loadingExceptionsApi.create(containerId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LOADING_EXCEPTIONS_KEY, 'by-container', vars.containerId] })
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY, 'detail', vars.containerId] })
      toast.success('Đã ghi nhận exception')
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Ghi nhận exception thất bại')),
  })
}

interface ApproveArgs {
  id: string
  containerId: string
  body: ApproveLoadingExceptionInput
}

/**
 * BE 409 means the exception was already stamped by another reviewer (race).
 * We let the caller render that case inline rather than emit a generic toast.
 */
export function useApproveLoadingException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: ApproveArgs) => loadingExceptionsApi.approve(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LOADING_EXCEPTIONS_KEY] })
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY, 'detail', vars.containerId] })
      toast.success('Đã duyệt exception')
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 409) return
      toast.error(mapApiErrorVi(err, 'Duyệt exception thất bại'))
    },
  })
}

interface RejectArgs {
  id: string
  containerId: string
  body: RejectLoadingExceptionInput
}

export function useRejectLoadingException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: RejectArgs) => loadingExceptionsApi.reject(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LOADING_EXCEPTIONS_KEY] })
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY, 'detail', vars.containerId] })
      toast.success('Đã từ chối exception')
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 409) return
      toast.error(mapApiErrorVi(err, 'Từ chối exception thất bại'))
    },
  })
}
