import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posApi, type POFilter } from '@/lib/api/pos'
import type { CreatePOInput } from '@/types/api'

export const POS_KEY = 'pos'
export const PO_LINE_ITEMS_KEY = 'po-line-items'

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
