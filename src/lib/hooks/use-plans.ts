import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi, type PlanFilter } from '@/lib/api/plans'
import type { CreatePlanInput } from '@/types/api'

export const PLANS_KEY = 'plans'

export function usePlans(filter: PlanFilter = {}) {
  return useQuery({
    queryKey: [PLANS_KEY, filter],
    queryFn: () => plansApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function usePlan(id: string | null) {
  return useQuery({
    queryKey: [PLANS_KEY, id],
    queryFn: () => plansApi.getById(id!),
    enabled: id !== null,
    staleTime: 30_000,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => plansApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}

export function useApprovePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => plansApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}

export function useCancelPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => plansApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}
