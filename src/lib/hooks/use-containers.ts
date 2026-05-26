import { useQuery } from '@tanstack/react-query'
import { containersApi } from '@/lib/api/containers'
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
