import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  loadingPlansApi,
  LoadingPlanUploadError,
  type UploadLoadingPlanInput,
} from '@/lib/api/loading-plans'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import type { ApproveLoadingPlanInput } from '@/types/api'
import { CONTAINERS_KEY } from '@/lib/hooks/use-containers'

export const LOADING_PLANS_KEY = 'loading-plans'

export function useActiveLoadingPlan(containerId: string | null) {
  return useQuery({
    queryKey: [LOADING_PLANS_KEY, 'by-container', containerId],
    queryFn: () => loadingPlansApi.getActiveForContainer(containerId!),
    enabled: !!containerId,
    staleTime: 15_000,
  })
}

export function useLoadingPlan(id: string | null) {
  return useQuery({
    queryKey: [LOADING_PLANS_KEY, 'detail', id],
    queryFn: () => loadingPlansApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useLoadingPlanDiff(newPlanId: string | null, againstId: string | null) {
  return useQuery({
    queryKey: [LOADING_PLANS_KEY, 'diff', newPlanId, againstId],
    queryFn: () => loadingPlansApi.getDiff(newPlanId!, againstId!),
    enabled: !!newPlanId && !!againstId,
    staleTime: 30_000,
  })
}

interface UploadArgs {
  containerId: string
  input: UploadLoadingPlanInput
}

/**
 * Upload deliberately does not toast on LoadingPlanUploadError — the caller
 * renders a structured error panel for those. Generic failures still toast.
 */
export function useUploadLoadingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ containerId, input }: UploadArgs) =>
      loadingPlansApi.upload(containerId, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LOADING_PLANS_KEY, 'by-container', vars.containerId] })
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      toast.success('Đã parse Excel — kiểm tra preview rồi approve')
    },
    onError: (err) => {
      if (err instanceof LoadingPlanUploadError) return
      toast.error(mapApiErrorVi(err, 'Upload Excel thất bại'))
    },
  })
}

interface ApproveArgs {
  id: string
  containerId: string
  body?: ApproveLoadingPlanInput
}

/**
 * BE 412 means the container has scanned lines and the caller must show the
 * V2 confirm dialog before resubmitting with confirm_supersede=true. We stay
 * silent on 412 so the caller can branch without parsing the message.
 */
export function useApproveLoadingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: ApproveArgs) => loadingPlansApi.approve(id, body ?? {}),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LOADING_PLANS_KEY] })
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY, 'detail', vars.containerId] })
      toast.success('Đã approve loading plan')
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 412) return
      toast.error(mapApiErrorVi(err, 'Approve plan thất bại'))
    },
  })
}
