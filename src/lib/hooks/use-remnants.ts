import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remnantsApi, type RemnantsFilter } from '@/lib/api/remnants'

export const REMNANTS_KEY = 'remnants'

export function useRemnants(filter: RemnantsFilter = {}) {
  return useQuery({
    queryKey: [REMNANTS_KEY, filter],
    queryFn: () => remnantsApi.list(filter),
  })
}

export function useAllocateRemnant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ remnantId, workOrderId }: { remnantId: string; workOrderId: string }) =>
      remnantsApi.allocate(remnantId, workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REMNANTS_KEY] })
    },
  })
}
