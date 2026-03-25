import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remnantsApi, type RemnantsFilter } from '@/lib/api/remnants'

export const REMNANTS_KEY = 'remnants'

export function useRemnants(filter: RemnantsFilter = {}) {
  return useQuery({
    queryKey: [REMNANTS_KEY, filter],
    queryFn: () => remnantsApi.list(filter),
  })
}

export function useRemnant(id: string) {
  return useQuery({
    queryKey: [REMNANTS_KEY, id],
    queryFn: () => remnantsApi.getById(id),
    enabled: !!id,
  })
}

export function useRemnantLineage(id: string) {
  return useQuery({
    queryKey: [REMNANTS_KEY, id, 'lineage'],
    queryFn: () => remnantsApi.getLineage(id),
    enabled: !!id,
  })
}

export function useOverflowStatus() {
  return useQuery({
    queryKey: ['overflow-status'],
    queryFn: remnantsApi.getOverflowStatus,
    refetchInterval: 60 * 1000, // poll every minute
  })
}

export function useSuggestAllocation() {
  return useMutation({
    mutationFn: remnantsApi.suggestAllocation,
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

export function useAssignLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, locationId }: { id: string; locationId: string }) =>
      remnantsApi.assignLocation(id, locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REMNANTS_KEY] })
    },
  })
}
