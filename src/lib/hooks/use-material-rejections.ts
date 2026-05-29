import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import { materialRejectionsApi } from '@/lib/api/material-rejections'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import type {
  MaterialRejection,
  MaterialRejectionsFilter,
  UpdateClaimInput,
} from '@/types/api'

export const MATERIAL_REJECTIONS_KEY = 'material-rejections'

export function useMaterialRejections(
  filter: Omit<MaterialRejectionsFilter, 'cursor'> = {},
) {
  return useCursorList({
    queryKey: [MATERIAL_REJECTIONS_KEY, 'list', filter],
    fetchPage: (cursor) =>
      materialRejectionsApi.list({ ...filter, cursor }),
    staleTime: 30_000,
  })
}

export function useMaterialRejection(id: string | null) {
  return useQuery({
    queryKey: [MATERIAL_REJECTIONS_KEY, 'detail', id],
    queryFn: () => materialRejectionsApi.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

interface UpdateClaimArgs {
  id: string
  body: UpdateClaimInput
}

/**
 * Optimistic claim update — we patch the cached row(s) immediately and roll
 * back on error. Rolls back on 409 too because that means BE refused the
 * transition (BR-INV05) and the row is unchanged on the server.
 */
export function useUpdateClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: UpdateClaimArgs) =>
      materialRejectionsApi.updateClaim(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: [MATERIAL_REJECTIONS_KEY] })
      const snapshot = qc.getQueriesData<{
        pages: { items: MaterialRejection[] }[]
      }>({ queryKey: [MATERIAL_REJECTIONS_KEY, 'list'] })

      qc.setQueriesData<{
        pages: { items: MaterialRejection[] }[]
        pageParams: unknown[]
      }>({ queryKey: [MATERIAL_REJECTIONS_KEY, 'list'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((row) =>
              row.id === id ? applyClaimPatch(row, body) : row,
            ),
          })),
        }
      })

      qc.setQueryData<MaterialRejection | undefined>(
        [MATERIAL_REJECTIONS_KEY, 'detail', id],
        (prev) => (prev ? applyClaimPatch(prev, body) : prev),
      )

      return { snapshot }
    },
    onError: (err, _vars, ctx) => {
      // Roll back to pre-mutation cache state.
      if (ctx?.snapshot) {
        for (const [key, value] of ctx.snapshot) {
          qc.setQueryData(key, value)
        }
      }
      if (err instanceof ApiClientError && err.status === 409) {
        toast.error('Trạng thái không hợp lệ. Tải lại và thử lại.')
        return
      }
      toast.error(mapApiErrorVi(err, 'Cập nhật khiếu nại thất bại'))
    },
    onSuccess: (data) => {
      qc.setQueryData<MaterialRejection>(
        [MATERIAL_REJECTIONS_KEY, 'detail', data.id],
        data,
      )
      toast.success('Đã cập nhật khiếu nại')
    },
    onSettled: () => {
      // Re-sync against server as the source of truth.
      qc.invalidateQueries({ queryKey: [MATERIAL_REJECTIONS_KEY] })
    },
  })
}

function applyClaimPatch(
  row: MaterialRejection,
  patch: UpdateClaimInput,
): MaterialRejection {
  return {
    ...row,
    claim_status: patch.claim_status ?? row.claim_status,
    claim_amount:
      patch.claim_amount !== undefined ? patch.claim_amount : row.claim_amount,
    claim_currency: patch.claim_currency ?? row.claim_currency,
    resolution_notes: patch.resolution_notes ?? row.resolution_notes,
  }
}
