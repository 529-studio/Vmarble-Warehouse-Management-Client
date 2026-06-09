import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posApi, type POFilter } from '@/lib/api/pos'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import type { CreatePOInput } from '@/types/api'

export const POS_KEY = 'pos'
export const PO_LINE_ITEMS_KEY = 'po-line-items'

/**
 * Cursor-paginated list for the /pos page.
 * Use this in the list view — it exposes `items`, `hasMore`, `fetchNextPage`, etc.
 */
export function usePOList(filter: Omit<POFilter, 'cursor'> = {}) {
  return useCursorList({
    queryKey: [POS_KEY, 'list', filter],
    fetchPage: (cursor) => posApi.list({ ...filter, cursor: cursor ?? undefined }),
    staleTime: 30_000,
  })
}

/**
 * Single-page fetch for dropdown / lookup callers (e.g. limit:200).
 * Returns the raw CursorResult — callers access `.items`.
 */
export function usePOs(filter: POFilter = {}) {
  return useQuery({
    queryKey: [POS_KEY, filter],
    queryFn: () => posApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreatePO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePOInput) => posApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POS_KEY] })
    },
  })
}

export function usePOLineItems(poId: string | null) {
  return useQuery({
    queryKey: [PO_LINE_ITEMS_KEY, poId],
    queryFn: () => posApi.getLineItems(poId!),
    enabled: poId !== null,
    staleTime: 30_000,
  })
}
