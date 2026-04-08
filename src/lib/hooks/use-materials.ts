import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materialsApi, type MaterialFilter } from '@/lib/api/materials'
import type { CreateMaterialInput } from '@/types/api'

export const MATERIALS_KEY = 'materials'

export function useMaterials(filter: MaterialFilter = {}) {
  return useQuery({
    queryKey: [MATERIALS_KEY, filter],
    queryFn: () => materialsApi.list(filter),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMaterialInput) => materialsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIALS_KEY] })
    },
  })
}
